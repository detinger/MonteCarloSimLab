// Domain adapters use the same replication/variable/day counter convention
// as the browser. All strings below are program-owned templates.
const py = {
  integration:`x = p["a"] + (p["b"]-p["a"])*u(0)
    f = {"sin":math.sin,"cos":math.cos,"one":lambda x:1,"negative":lambda x:-1,
         "linear":lambda x:x,"square":lambda x:x*x,"gaussian":lambda x:math.exp(-x*x)}[model["integrand"]]
    y = f(x)
    output = (p["b"]-p["a"])*y
    return output, output>0, [(x,y)] if i<256 else []`,
  montyhall:`prize, pick = int(3*u(0)), int(3*u(1))
    eligible = [door for door in range(3) if door not in (prize,pick)]
    opened = eligible[int(u(2)*len(eligible))]
    switched = 3-pick-opened
    return int(switched==prize), switched==prize, []`,
  randomwalk:`x, y = 0, 0
    path = [(0,0)] if i<8 else []
    for t in range(p["steps"]):
        dx, dy = [(1,0),(-1,0),(0,1),(0,-1)][int(u(0,t)*4)]
        x, y = x+dx, y+dy
        if i<8: path.append((x*p["length"],y*p["length"]))
    return (x*x+y*y)*p["length"]**2, x==y==0, path`,
  stock:`price = p["price"]
    path = [(0,price)] if i<8 else []
    for t in range(p["steps"]):
        price *= math.exp((p["drift"]-p["volatility"]**2/2)/p["year"] + p["volatility"]/math.sqrt(p["year"])*z(0,t))
        if i<8: path.append((t+1,price))
    return price, price<p["threshold"], path`,
  projectmgmt:`finish, starts = {}, {}
    for task in model["plan"]:
        stream = task["stream"]
        a, b, c = (task.get(k) for k in ("a","b","c"))
        family = task["distribution"]
        if family == "constant":
            duration = a
        else:
            u1, u2 = draws(i,stream,model["seed"])
            if family == "triangular":
                mode = (b-a)/(c-a)
                duration = a+(c-a)*math.sqrt(u1*mode) if u1<mode else c-(c-a)*math.sqrt((1-u1)*(1-mode))
            elif family == "pert":
                from scipy.special import betaincinv
                mode = (b-a)/(c-a)
                duration = a+(c-a)*float(betaincinv(1+4*mode,1+4*(1-mode),u1+0.5/2**32))
            elif family == "lognormal":
                variance = math.log1p(b*b)
                normal = math.sqrt(-2*math.log1p(-u1))*math.cos(2*math.pi*u2)
                duration = a*math.exp(-variance/2+math.sqrt(variance)*normal)
            elif family == "truncated":
                for attempt in range(128):
                    duration = a+b*math.sqrt(-2*math.log1p(-u1))*math.cos(2*math.pi*u2)
                    if duration >= 0: break
                    u1,u2 = draws(i,stream,(model["seed"]+attempt+1)%2**32)
                else:
                    raise ValueError("Truncated normal exceeded its draw limit")
        start = max((finish[pred] for pred in task["dependsOn"]),default=0)
        starts[task["id"]] = start
        finish[task["id"]] = start+duration
    output = max(finish.values())
    critical = set()
    tol = sys.float_info.epsilon*max(1,output)*len(model["plan"])*4
    for task in reversed(model["plan"]):
        name = task["id"]
        if abs(finish[name]-output)<=tol: critical.add(name)
        if name in critical:
            critical.update(pred for pred in task["dependsOn"] if abs(starts[name]-finish[pred])<=tol)
    critical_counts.update(critical)
    return output, output<=p["threshold"], []`,
  manufacturing:`output = 0.0
    for day in range(p["days"]):
        if u(0,day)<p["breakdown"]/100: continue
        labor = min(1,max(.5,.9+.05*z(1,day)))
        material = min(1,max(.4,.85+.1*z(2,day)))
        output += p["capacity"]*labor*material*p["yieldRate"]
    return output, output>=p["threshold"], []`,
}
export function pythonDomain(m) {
  return `def domain_row(i):
    p = model["params"]
    def pair(channel, step):
        stream = (model["stream"] + channel*8192 + step) % 2**32
        return draws(i,stream,model["seed"])
    def u(channel, step=0):
        return pair(channel,step)[0]
    def z(channel, step=0):
        a,b = pair(channel,step)
        return math.sqrt(-2*math.log1p(-a))*math.cos(2*math.pi*b)
    `+py[m.kind]
}

const r = {
  integration:`x <- p$a+(p$b-p$a)*u(0)
f <- switch(integrand, sin=sin,cos=cos,one=function(x) rep(1,length(x)),negative=function(x) rep(-1,length(x)),
            linear=function(x) x,square=function(x) x*x,gaussian=function(x) exp(-x*x))
output <- (p$b-p$a)*f(x)
event <- output>0`,
  montyhall:`prize <- floor(3*u(0))
pick <- floor(3*u(1))
eligible1 <- ifelse(pick!=0 & prize!=0,0,ifelse(pick!=1 & prize!=1,1,2))
eligible2 <- ifelse(pick!=2 & prize!=2,2,ifelse(pick!=1 & prize!=1,1,0))
opened <- ifelse(pick==prize & u(2)>=.5,eligible2,eligible1)
event <- 3-pick-opened == prize
output <- as.numeric(event)`,
  randomwalk:`x <- y <- numeric(n)
shown <- seq_len(min(n,8))
xs <- ys <- matrix(0,nrow=p$steps+1,ncol=length(shown))
for(t in seq_len(p$steps)-1L) {
  dir <- floor(u(0,t)*4)
  x <- x+(dir==0)-(dir==1)
  y <- y+(dir==2)-(dir==3)
  xs[t+2,] <- x[shown]*p$length
  ys[t+2,] <- y[shown]*p$length
}
output <- (x*x+y*y)*p$length^2
event <- x==0 & y==0`,
  stock:`output <- rep(p$price,n)
shown <- seq_len(min(n,8))
paths <- matrix(p$price,nrow=p$steps+1,ncol=length(shown))
for(t in seq_len(p$steps)-1L) {
  output <- output*exp((p$drift-p$volatility^2/2)/p$year+p$volatility/sqrt(p$year)*z(0,t))
  paths[t+2,] <- output[shown]
}
event <- output<p$threshold`,
  projectmgmt:`finish <- starts <- list()
for(task in plan){
  a <- task$a
  b <- task$b
  cmax <- task$c
  family <- task$family
  draw <- draws(index, task$stream, seed)
  if(family == "constant"){
    duration <- rep(a,n)
  } else if(family == "triangular"){
    mode <- (b-a)/(cmax-a)
    duration <- ifelse(draw$u<mode,a+(cmax-a)*sqrt(draw$u*mode),cmax-(cmax-a)*sqrt((1-draw$u)*(1-mode)))
  } else if(family == "pert"){
    mode <- (b-a)/(cmax-a)
    duration <- a+(cmax-a)*qbeta(draw$u+.5/2^32,1+4*mode,1+4*(1-mode))
  } else if(family == "lognormal"){
    variance <- log1p(b*b)
    normal <- sqrt(-2*log1p(-draw$u))*cos(2*pi*draw$v)
    duration <- a*exp(-variance/2+sqrt(variance)*normal)
  } else if(family == "truncated"){
    duration <- a+b*sqrt(-2*log1p(-draw$u))*cos(2*pi*draw$v)
    for(attempt in seq_len(127)){
      rejected <- which(duration<0)
      if(!length(rejected))break
      retry <- draws(index[rejected],task$stream,(seed+attempt) %% 2^32)
      duration[rejected] <- a+b*sqrt(-2*log1p(-retry$u))*cos(2*pi*retry$v)
    }
    stopifnot(all(duration>=0))
  }
  start <- numeric(n)
  for(pred in task$parents)start <- pmax(start,finish[[pred]])
  starts[[task$id]] <- start
  finish[[task$id]] <- start+duration
}
output <- Reduce(pmax,finish)
tol <- .Machine$double.eps*pmax(1,output)*length(plan)*4
critical <- lapply(finish,function(f) abs(f-output)<=tol)
for(task in rev(plan))for(pred in task$parents){
  critical[[pred]] <- critical[[pred]] | (critical[[task$id]] & abs(starts[[task$id]]-finish[[pred]])<=tol)
}
critical_frequencies <- vapply(critical,mean,numeric(1))
print(critical_frequencies)
event <- output<=p$threshold`,
  manufacturing:`output <- numeric(n)
for(t in seq_len(p$days)-1L){
  active <- u(0,t)>=p$breakdown/100
  labor <- pmin(1,pmax(.5,.9+.05*z(1,t)))
  material <- pmin(1,pmax(.4,.85+.1*z(2,t)))
  output <- output+p$capacity*active*labor*material*p$yieldRate
}
event <- output>=p$threshold`,
}

export function rDomain(m,fields) {
  // Field keys come exclusively from the validated, internal domain catalog.
  const params=fields.map(f=>f.key+'='+m.params[f.key]).join(', ')
  const plan=m.plan?.map(t=>{
    const parents='c('+t.dependsOn.map(id=>JSON.stringify(id)).join(',')+')'
    return 'list(id='+JSON.stringify(t.id)+',family='+JSON.stringify(t.distribution)+',stream='+t.stream+
      ',a='+t.a+',b='+(t.b??0)+',c='+(t.c??0)+',parents='+parents+')'
  }).join(',\n  ')
  return ['p <- list('+params+')','stream <- '+m.stream,plan?'plan <- list('+plan+')':'',
    m.kind==='integration'?'integrand <- '+JSON.stringify(m.integrand):'',
    `pair <- function(channel,step) draws(index,(stream+channel*8192+step) %% 2^32,seed)
u <- function(channel,step=0) pair(channel,step)$u
z <- function(channel,step=0){
  d <- pair(channel,step)
  sqrt(-2*log1p(-d$u))*cos(2*pi*d$v)
}`,r[m.kind]].join('\n')
}

export function rPlot(kind) {
  const scene={
    integration:'plot(x, f(x), xlab="x", ylab="f(x)", main="Sampled integrand", pch=20); abline(h=0,lty=2)',
    montyhall:'matplot(seq_len(n),cbind(cumsum(output),cumsum(1-output))/seq_len(n),type="l",xlab="Game",ylab="Win fraction"); legend("topright",c("Switch","Stay"),col=1:2,lty=1:2)',
    stock:'matplot(0:(nrow(paths)-1),paths,type="l",xlab="Trading day",ylab="Price (model currency units)",main="Traced GBM paths")',
    randomwalk:'matplot(xs,ys,type="l",asp=1,xlab="East",ylab="North",main="Lattice trajectories")',
    projectmgmt:'hist(output,xlab="Days",main="Project duration"); abline(v=p_threshold,lty=2)',
    manufacturing:'hist(output,xlab="Equivalent units",main="Monthly production"); abline(v=p_threshold,lty=2)',
    pi:'plot(2*d$u[seq_len(min(n,2048))]-1,2*d$v[seq_len(min(n,2048))]-1,pch=20,asp=1,col=ifelse(event[seq_len(min(n,2048))],1,2),xlab="x",ylab="y",main="Dartboard")',
    builder:'hist(output,xlab="Model output",main="Replications")',
  }[kind]
  return 'if (interactive() || "--plot" %in% commandArgs(trailingOnly=TRUE)) {\n  '+scene+'\n}'
}
