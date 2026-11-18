import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for(const theme of ['light','dark']){
  test('core workspaces meet automated accessibility checks in '+theme,async({page})=>{
    test.setTimeout(120000)
    const findings=[]
    for(const id of ['overview','builder','industry','simchallenges','pi','inventory','distributions','helper','theory','lessons','challenges','analysis','compare','labs']){
      await page.goto('/#/'+id)
      await page.locator('.screen-'+id+' h1').waitFor()
      await page.getByLabel('Color theme').selectOption(theme)
      const report=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
      for(const v of report.violations) findings.push({page:id,rule:v.id,example:v.nodes[0].target,details:v.nodes[0].failureSummary})
    }
    expect(findings).toEqual([])
  })
}
