export const unaryFunctions = ['abs','sqrt','log','exp']
export const binaryFunctions = ['min','max']
export const reservedNames = [...unaryFunctions,...binaryFunctions]

// Recursive descent over arithmetic tokens. References always resolve to one
// already sampled input, including when a variable appears twice.
export function parseFormula(source,names) {
  if(typeof source!=='string'||source.length>4096) throw Error('Enter a formula of at most 4096 characters.')
  const tokens=source.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|[^\s]/g)||[]
  if(tokens.length>1024) throw Error('Simplify the formula to at most 1024 tokens.')
  let depth=0
  for(const token of tokens) {
    if(token==='(' && ++depth>64) throw Error('Use at most 64 levels of parentheses.')
    if(token===')') depth--
  }
  let at=0
  function close(){
    if(tokens[at++]!==')') throw Error('Close the parentheses in the formula.')
  }
  function atom(){
    const token=tokens[at++]
    if(token==='('){
      const tree=sum()
      close()
      return tree
    }
    if(reservedNames.includes(token)){
      if(tokens[at++]!=='(')throw Error(token+' needs parentheses around its arguments.')
      const first=sum()
      if(unaryFunctions.includes(token)){
        close()
        return {op:token,value:first}
      }
      if(tokens[at++]!==',')throw Error(token+' requires two comma-separated arguments.')
      const right=sum()
      close()
      return {op:token,left:first,right}
    }
    if(names.includes(token))return {op:'ref',name:token}
    if(token&&/^[\d.]/.test(token)&&Number.isFinite(Number(token)))return {op:'num',value:Number(token)}
    throw Error('Expected an input name or number at '+(token??'the end of the formula')+'.')
  }
  function power(){
    const left=atom()
    if(tokens[at]!=='^')return left
    at++
    return {op:'^',left,right:unary()}
  }
  function unary(){
    if(tokens[at]==='-'){at++;return {op:'neg',value:unary()}}
    if(tokens[at]==='+'){at++;return unary()}
    return power()
  }
  function product(){
    let tree=unary()
    while(['*','/'].includes(tokens[at]))tree={left:tree,op:tokens[at++],right:unary()}
    return tree
  }
  function sum(){
    let tree=product()
    while(['+','-'].includes(tokens[at]))tree={left:tree,op:tokens[at++],right:product()}
    return tree
  }
  const tree=sum()
  if(at!==tokens.length)throw Error('Unexpected formula token '+tokens[at]+'.')
  return tree
}

export function evaluate(tree,values,strict=true) {
  const result=evaluateNode(tree,values,strict)
  if(strict && !Number.isFinite(result))throw Error('Formula operator '+tree.op+' produced a nonfinite value.')
  return result
}

function evaluateNode(tree,values,strict) {
  if(tree.op==='ref')return values[tree.name]
  if(tree.op==='num')return tree.value
  if(tree.op==='neg')return -evaluate(tree.value,values,strict)
  if(unaryFunctions.includes(tree.op)) return Math[tree.op](evaluate(tree.value,values,strict))
  const a=evaluate(tree.left,values,strict),b=evaluate(tree.right,values,strict)
  switch(tree.op){
    case '+':return a+b
    case '-':return a-b
    case '*':return a*b
    case '/':return a/b
    case '^':return a**b
    case 'min':return Math.min(a,b)
    case 'max':return Math.max(a,b)
    default:throw Error('Unknown formula operator.')
  }
}

function powers(units,scale) {
  if(!units)return null
  return new Map([...units].map(([u,n])=>[u,n*scale]).filter(([,n])=>n!==0))
}

export function dimensions(tree,inputs) {
  if(tree.op==='ref'){
    const unit=inputs.find(input=>input.name===tree.name).unit?.trim()
    return unit?new Map([[unit,1]]):null
  }
  if(tree.op==='num')return new Map()
  if(tree.op==='neg'||unaryFunctions.includes(tree.op)){
    const units=dimensions(tree.value,inputs)
    if(['log','exp'].includes(tree.op)){
      if(units?.size)throw Error(tree.op+' requires a dimensionless argument.')
      return new Map()
    }
    return tree.op==='sqrt'?powers(units,0.5):units
  }
  const left=dimensions(tree.left,inputs),right=dimensions(tree.right,inputs)
  if(['+','-','min','max'].includes(tree.op)){
    if(left&&right&&(left.size!==right.size||[...left].some(([u,n])=>right.get(u)!==n)))
      throw Error('Addition, subtraction, min and max require matching input units.')
    return left||right
  }
  if(tree.op==='^'){
    if(right?.size)throw Error('An exponent must be dimensionless.')
    const exp=evaluate(tree.right,Object.fromEntries(inputs.filter(i=>i.distribution==='constant').map(i=>[i.name,i.a])),false)
    if(left?.size&&!Number.isFinite(exp))throw Error('A unit-bearing base requires a fixed exponent.')
    return powers(left,exp)
  }
  if(!left||!right)return null
  for(const [unit,power] of right){
    const exponent=(left.get(unit)||0)+(tree.op==='*'?power:-power)
    if(exponent)left.set(unit,exponent)
    else left.delete(unit)
  }
  return left
}
