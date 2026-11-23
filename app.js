(() => {
  "use strict";
  const places = [
    {key:0,label:"до цілих",digits:0,unit:"цілих"},
    {key:1,label:"до десятих",digits:1,unit:"десятих"},
    {key:2,label:"до сотих",digits:2,unit:"сотих"},
    {key:3,label:"до тисячних",digits:3,unit:"тисячних"},
    {key:4,label:"до десятитисячних",digits:4,unit:"десятитисячних"}
  ];
  const $ = id => document.getElementById(id);
  let task = null, solved = 0, streak = 0, answered = false, selectedBoundary = null;

  function makeNumber() {
    const specials = ["3,996","9,995","1,9996","0,9995","12,9994","5,0951","0,8742","12,3456","104,2389","7,0008","48","125","7","390","100","0"];
    if (Math.random() < .48) return specials[Math.floor(Math.random()*specials.length)];
    const whole = Math.floor(Math.random()*250);
    const decimals = String(Math.floor(Math.random()*10000)).padStart(4,"0");
    return Math.random()<.16 ? String(whole) : `${whole},${decimals}`;
  }

  function normalize(num) {
    return num.replace(",",".");
  }
  function roundedValue(raw, placesCount) {
    const [whole, frac=""] = normalize(raw).split(".");
    if (placesCount === 0) {
      const next = Number((frac+"0")[0]);
      let w = BigInt(whole);
      if (next >= 5) w += 1n;
      return String(w);
    }
    const padded = (frac + "00000").slice(0, Math.max(placesCount+1,5));
    let kept = padded.slice(0,placesCount);
    const next = Number(padded[placesCount] || 0);
    let combined = BigInt(whole + kept);
    if (next >= 5) combined += 1n;
    const scale = 10n ** BigInt(placesCount);
    const w = combined / scale;
    const f = String(combined % scale).padStart(placesCount,"0");
    return `${w},${f}`;
  }
  function displayResult(s) {
    if (!s.includes(",")) return s;
    return s.replace(/,?0+$/,"").replace(/,$/,"");
  }
  function makeWrong(raw, p, correct) {
    const normalized = normalize(raw), [whole,frac=""] = normalized.split(".");
    const target = p===0 ? Number(whole) : Number(frac[p-1] || 0);
    const next = Number(frac[p] || 0);
    let wrong;
    if (next >= 5) wrong = roundedValue(raw,p); // fallback replaced below
    if (p===0) {
      wrong = String(Math.max(0,Number(whole) + (next>=5 ? 0 : 1)));
    } else {
      let wrongDigits = frac.padEnd(p,"0").slice(0,p);
      let n = BigInt(whole + wrongDigits);
      // typical mistake: ignore the rounding digit / make the opposite decision
      if (next < 5) n += 10n ** BigInt(p-1);
      const scale = 10n ** BigInt(p), w=n/scale, f=String(n%scale).padStart(p,"0");
      wrong = `${w},${f}`;
    }
    if (displayResult(wrong) === displayResult(correct)) {
      wrong = p===0 ? String(Number(correct)+1) : `${whole},${"0".repeat(Math.max(0,p-1))}${(target+1)%10}`;
    }
    return displayResult(wrong);
  }
  function getPlaceName(p) { return places[p].unit; }
  function newTask() {
    const raw = makeNumber();
    const p = Math.floor(Math.random()*5);
    const correctRaw = roundedValue(raw,p);
    const correct = displayResult(correctRaw);
    const wrong = makeWrong(raw,p,correctRaw);
    const options = Math.random()<.5 ? [correct,wrong] : [wrong,correct];
    task = {raw,p,correct,options};
    answered = false;
    selectedBoundary = null;
    $("taskPrompt").textContent = `Округли число ${raw} ${places[p].label}.`;
    $("feedback").textContent = "Спочатку встанови межу, а потім обери відповідь.";
    $("feedback").className = "feedback";
    $("hintText").hidden = true;
    $("hintText").textContent = "";
    renderNumber();
    $("answers").innerHTML = "";
    options.forEach((value,i)=>{
      const btn=document.createElement("button");
      btn.className="answer-btn"; btn.type="button"; btn.textContent=value;
      btn.addEventListener("click",()=>checkAnswer(value,btn));
      $("answers").appendChild(btn);
    });
    $("explanationText").textContent = "Після вибору відповіді тут з'явиться пояснення: який розряд округлюємо, на яку цифру дивимося та як отримуємо результат.";
  }
  function renderNumber() {
    const line=$("numberLine"); line.innerHTML="";
    const chars=task.raw.split("");
    const decimalIndex=chars.indexOf(",");
    const targetIndex = decimalIndex===-1 ? chars.length-1 : (task.p===0 ? decimalIndex-1 : decimalIndex+task.p);
    chars.forEach((char,i)=>{
      const wrap=document.createElement("span"); wrap.className="digit-wrap";
      if(i===targetIndex) wrap.classList.add("target");
      const digit=document.createElement("span"); digit.className="digit"+(char===","?" comma":""); digit.textContent=char;
      wrap.appendChild(digit);
      if(i<chars.length-1){
        const gap=document.createElement("button"); gap.type="button"; gap.className="gap";
        gap.setAttribute("aria-label",`Поставити межу після символу ${char}`);
        if(selectedBoundary===i) gap.classList.add("selected");
        gap.addEventListener("click",()=>{selectedBoundary=i;renderNumber();});
        wrap.appendChild(gap);
      }
      line.appendChild(wrap);
    });
    const expectedBoundary = targetIndex;
    $("boundaryCaption").textContent = selectedBoundary===null
      ? "Натисни на проміжок після цифри потрібного розряду."
      : `Межа після символу «${chars[selectedBoundary]}»${selectedBoundary===expectedBoundary ? " — саме тут!" : " — спробуй знайти потрібний розряд."}`;
  }
  function checkAnswer(value, chosen) {
    if(answered) return;
    answered=true; solved++;
    const isCorrect=value===task.correct;
    streak=isCorrect?streak+1:0;
    $("solvedCount").textContent=solved;
    $("streakCount").textContent=streak;
    [...$("answers").children].forEach(btn=>{
      btn.disabled=true;
      if(btn.textContent===task.correct) btn.classList.add("correct");
      else if(btn===chosen) btn.classList.add("wrong");
    });
    $("feedback").textContent=isCorrect?"✓ Правильно! Чудова робота!":"Не зовсім так. Нічого страшного — розберімо разом!";
    $("feedback").className=`feedback ${isCorrect?"good":"bad"}`;
    explain();
  }
  function explain() {
    const raw=task.raw, p=task.p, normalized=normalize(raw), [whole,frac=""]=normalized.split(".");
    const targetDigit=p===0 ? whole[whole.length-1] : (frac[p-1]||"0");
    const nextDigit=frac[p]||"0";
    const boundaryIndex=raw.indexOf(",")===-1 ? raw.length-1 : raw.indexOf(",")+p;
    const chars=raw.split("");
    const correct=task.correct;
    const boundaryText=selectedBoundary===null ? "межу ще не було встановлено" :
      `межу ти поставив/поставила після символу «${chars[selectedBoundary]}»`;
    const action=Number(nextDigit)>=5 ? "збільшуємо цифру потрібного розряду на 1" : "залишаємо цифру потрібного розряду без змін";
    const group=Number(nextDigit)>=5 ? "5–9" : "0–4";
    const carry = p>0 && Number(nextDigit)>=5 && targetDigit==="9";
    const details = [
      `<li><strong>Знайди розряд.</strong> Округлюємо до <span class="math-chip">${places[p].label}</span>. Цифра в цьому розряді — <span class="math-chip">${targetDigit}</span>. ${boundaryText}. Правильна межа — після цифри потрібного розряду.</li>`,
      `<li><strong>Подивись праворуч.</strong> Наступна цифра — <span class="math-chip">${nextDigit}</span>. Саме вона визначає округлення.</li>`,
      `<li><strong>Застосуй правило.</strong> Цифра ${nextDigit} належить до групи ${group}, тому ${action}.${carry?" Оскільки в потрібному розряді була 9, одиниця переходить до наступного розряду ліворуч — це ланцюгове округлення.":""}</li>`,
      `<li><strong>Запиши результат.</strong> Отримуємо <span class="math-chip">${correct}</span>. Нулі наприкінці дробової частини можна не записувати: наприклад, 4,500 = 4,5. Але нулі всередині числа зберігаємо.</li>`
    ];
    $("explanationText").innerHTML=`<ol>${details.join("")}</ol>`;
  }
  function showHint() {
    if(!task) return;
    const p=task.p, frac=normalize(task.raw).split(".")[1]||"";
    const next=frac[p]||"0";
    $("hintText").hidden=false;
    $("hintText").textContent=`Підказка: знайди розряд ${places[p].label}. Потім подивись на цифру праворуч — це ${next}. Якщо вона 0–4, не додавай; якщо 5–9, додай 1.`;
  }
  $("newTaskBtn").addEventListener("click",newTask);
  $("hintBtn").addEventListener("click",showHint);
  newTask();
})();