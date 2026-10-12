import assert from 'node:assert/strict';
// Read rendered styles, including translucent ancestors and gradient endpoints.
export async function assertReadable(page, selector, minimum = 4.5) {
  const rows = await page.locator(selector).evaluateAll(elements => {
    const parse = value => { const m=value.match(/^rgba?\(([^)]+)\)$/);if(!m)throw new Error('Unsupported computed color: '+value);const parts=m[1].split(',').map(Number);return [parts[0],parts[1],parts[2],parts[3]??1]; };
    const blend=(top,bottom)=>top.slice(0,3).map((value,i)=>value*top[3]+bottom[i]*(1-top[3])).concat(1);
    const luminance=color=>color.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    return elements.filter(el=>el.getBoundingClientRect().width&&el.getBoundingClientRect().height&&el.textContent.trim()&&!el.disabled).map(el=>{
      let backgrounds=[[255,255,255,1]],ancestors=[];for(let current=el;current;current=current.parentElement)ancestors.unshift(current);
      for(const parent of ancestors){const css=getComputedStyle(parent),color=parse(css.backgroundColor);backgrounds=backgrounds.map(bg=>blend(color,bg));if(css.backgroundImage.startsWith('linear-gradient(')){const stops=[...css.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(match=>parse(match[0]));if(stops.length)backgrounds=backgrounds.flatMap(bg=>stops.map(stop=>blend(stop,bg)));}}
      const foreground=parse(getComputedStyle(el).color),ratios=backgrounds.map(bg=>{const fg=blend(foreground,bg),a=luminance(fg),b=luminance(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});
      return {text:el.textContent.trim().slice(0,80),ratio:Math.min(...ratios)};
    });
  });
  assert.ok(rows.length,'No visible text matched '+selector);
  for(const row of rows)assert.ok(row.ratio>=minimum,`${selector}: ${row.text} contrast ${row.ratio.toFixed(2)} < ${minimum}`);
  return Math.min(...rows.map(row=>row.ratio));
}
