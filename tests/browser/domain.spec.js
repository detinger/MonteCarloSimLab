import {test,expect} from '@playwright/test'

for (const kind of ['integration','montyhall','randomwalk','stock','projectmgmt','manufacturing']) {
  test(kind+' preserves its run across reload, import and export',async({page})=>{
    await page.goto('/#/'+kind)
    const lab=page.locator('.domain-page:visible')
    const complete=lab.getByText('complete',{exact:true})
    await expect(complete).toBeVisible()
    await lab.getByLabel('Random seed').fill('77')
    await expect(lab.getByText('From earlier settings')).toBeVisible()
    await lab.getByRole('button',{name:'Run simulation'}).click()
    await expect(complete).toBeVisible()
    await lab.getByText('Analyze distribution and convergence').click()
    await lab.getByRole('button',{name:'Cumulative frequency'}).click()
    await lab.getByRole('button',{name:'View Python and R'}).click()
    await expect(lab.getByText('Python Code',{exact:true})).toBeVisible()
    const estimate=await lab.locator('.pi-metrics dd').first().innerText()
    await lab.getByRole('button',{name:'Save run on device'}).click()
    await expect(lab.getByText('Saved this run on this device.')).toBeVisible()
    await page.reload()
    await lab.getByRole('button',{name:'Reopen saved run'}).click()
    await expect(lab.getByText('Reopened run and reproduced its saved summary.')).toBeVisible()
    await expect(lab.locator('.pi-metrics dd').first()).toHaveText(estimate)
    for(const format of ['svg','png','zip','replications.csv','json']){
      await lab.getByLabel('File format').selectOption(format)
      const [download]=await Promise.all([page.waitForEvent('download'),lab.getByRole('button',{name:'Download',exact:true}).click()])
      expect(await download.failure()).toBeNull()
      expect(download.suggestedFilename()).toBe(kind+'-77.'+format)
      if(format==='json'){
        await lab.locator('input[type=file]').setInputFiles(await download.path())
        await expect(lab.getByText('Reopened run and reproduced its saved summary.')).toBeVisible()
      }
    }
  })
}

test('scheduling editor validates cycles and runs parallel predecessors',async({page})=>{
  await page.goto('/#/projectmgmt')
  const lab=page.locator('.domain-page:visible')
  await lab.getByRole('button',{name:'Edit activities and dependencies'}).click()
  const cards=lab.locator('.schedule-editor details')
  await cards.nth(0).getByRole('checkbox',{name:'Construction (construction)'}).check()
  await expect(lab.getByText(/Dependency cycle among/)).toBeVisible()
  await expect(lab.getByRole('button',{name:'Run simulation'})).toBeDisabled()
  await cards.nth(0).getByRole('checkbox',{name:'Construction (construction)'}).uncheck()
  await cards.nth(1).getByRole('checkbox',{name:'Procurement (procurement)'}).uncheck()
  await cards.nth(2).getByRole('checkbox',{name:'Procurement (procurement)'}).check()
  for(const [i,days] of [10,20,5].entries()){
    await cards.nth(i).getByLabel('Duration distribution').selectOption('constant')
    await cards.nth(i).getByLabel('Duration (days)',{exact:true}).fill(String(days))
  }
  await lab.getByRole('button',{name:'Run simulation'}).click()
  await expect(lab.locator('.pi-metrics dd').first()).toHaveText('25')
})
test('walker views expose endpoints, heatmap and ensemble moments',async({page})=>{
  await page.goto('/#/randomwalk')
  const lab=page.locator('.domain-page:visible')
  for(const [option,label] of [['endpoints','Walker endpoints'],['heatmap','Endpoint frequency heatmap'],['msd','Mean squared displacement by step']]){
    await lab.getByLabel('Walk view').selectOption(option)
    await expect(lab.getByRole('img',{name:label})).toBeVisible()
  }
})
