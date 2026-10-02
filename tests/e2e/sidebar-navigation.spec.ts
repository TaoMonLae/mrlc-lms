import {test,expect,type Page} from '@playwright/test';
import {CURRENT_RELEASE} from '../../src/data/releases';
async function setup(page:Page,role='ADMIN') {
 const user={id:'nav-demo',role,firstName:'Demo',lastName:'Account',isActive:true,cursorEffect:'NONE'};
 await page.addInitScript(({user,id})=>{sessionStorage.setItem('auth_token','demo');sessionStorage.setItem('auth_user',JSON.stringify(user));localStorage.setItem(`mrlc:release-seen:${user.id}`,id);localStorage.setItem('mrlc-lms-theme','light')},{user,id:CURRENT_RELEASE.id});
 await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill({json:p==='/api/auth/me'?{user}:p.includes('settings')||p.includes('branding')?{name:'Mon Refugee Learning Centre',logoUrl:'/icon-192.png',shortName:'MRLC-GED'}:[]})});
 await page.goto('/about');
 await expect(page.getByRole('heading',{name:'Education, dignity and a clear next step.'})).toBeVisible();
}
test('groups, current route, keyboard rail menus and mobile closing',async({page},info)=>{
 await setup(page);
 const mobile=info.project.name.includes('mobile');
 if(mobile) await page.getByRole('button',{name:'Toggle sidebar navigation',exact:true}).first().click();
 const academics=page.getByRole('button',{name:'Academics',exact:true});
 await academics.click();await expect(academics).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('link',{name:'Exams',exact:true})).toHaveAttribute('href','/exams');
 await page.getByRole('button',{name:'People',exact:true}).click();await expect(academics).toHaveAttribute('aria-expanded','false');
 await page.screenshot({animations:'disabled',path:info.outputPath('sidebar-expanded.png')});
 if(mobile){
  await page.getByRole('button',{name:'Close navigation',exact:true}).click();await expect(page.getByRole('dialog',{name:'Sidebar'})).not.toBeVisible();
  await page.getByRole('button',{name:'Toggle sidebar navigation',exact:true}).first().click();
  await page.getByRole('button',{name:'System',exact:true}).click();
  await page.getByRole('link',{name:'About',exact:true}).click();await expect(page.getByRole('dialog',{name:'Sidebar'})).not.toBeVisible();
 }else{
  await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
  const rail=page.getByRole('button',{name:'Academics',exact:true});await rail.focus();await page.keyboard.press('Enter');
  const menu=page.getByRole('menu');await expect(menu.getByRole('menuitem',{name:'Exams',exact:true})).toHaveAttribute('href','/exams');
  await page.keyboard.press('ArrowDown');await expect(menu.locator(':focus')).toHaveCount(1);
  await page.screenshot({animations:'disabled',path:info.outputPath('sidebar-rail-menu.png')});
  await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();await expect(rail).toBeFocused();
  await page.getByRole('button',{name:'System',exact:true}).click();await expect(page.getByRole('menuitem',{name:'About',exact:true})).toHaveAttribute('aria-current','page');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('student navigation excludes administration',async({page},info)=>{
 await setup(page,'STUDENT');if(info.project.name.includes('mobile'))await page.getByRole('button',{name:'Toggle sidebar navigation',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'Finance & HR',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'System',exact:true})).toHaveCount(0);
});
