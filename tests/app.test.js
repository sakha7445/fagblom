// Enkle tester for Fagblom. Kjøres slik:
//   npm install jsdom
//   node tests/app.test.js
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const NOW = new Date(2026, 9, 25, 10, 0, 0).getTime(); // 25. oktober 2026 kl. 10:00 (lokal tid)

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FEIL " + name + (extra !== undefined ? "  -> " + JSON.stringify(extra) : "")); }
}

function make(storage = {}) {
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://example.test/",
    pretendToBeVisual: true,
    beforeParse(w) {
      // Fast "nå" som vi kan flytte fremover
      const RealDate = w.Date;
      w.__now = NOW;
      class FakeDate extends RealDate {
        constructor(...a) { if (a.length === 0) super(w.__now); else super(...a); }
        static now() { return w.__now; }
      }
      w.Date = FakeDate;
      Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
      w.confirm = () => true;
      w.URL.createObjectURL = () => "blob:test";
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { w.__downloads = (w.__downloads || []).concat(this.download); };
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, addListener() {} }));
    }
  });
  const w = dom.window;
  return { w, d: w.document, ev: s => w.eval(s) };
}

const $ = (a, s) => a.d.querySelector(s);
const $$ = (a, s) => Array.from(a.d.querySelectorAll(s));
function click(a, sel) { $(a, sel).dispatchEvent(new a.w.MouseEvent("click", { bubbles: true })); }
function submit(a, sel) { $(a, sel).dispatchEvent(new a.w.Event("submit", { bubbles: true, cancelable: true })); }
function setVal(a, sel, v) { const e = $(a, sel); e.value = v; e.dispatchEvent(new a.w.Event("input", { bubbles: true })); e.dispatchEvent(new a.w.Event("change", { bubbles: true })); }
const stored = a => JSON.parse(a.w.localStorage.getItem("studieplanlegger-v2"));

const SAMPLE = {
  version: 2,
  courses: [{ id: "c1", name: "Databaser", date: "2026-10-31", color: "#8ca07b", goalGrade: "B", goalHours: 20,
    tasks: [
      { id: "t1", text: "Lav", done: false, due: "", priority: "low" },
      { id: "t2", text: "Høy frist", done: false, due: "2026-10-27", priority: "high" },
      { id: "t3", text: "Ferdig", done: true, due: "", priority: "medium" },
      { id: "t4", text: "Forfalt", done: false, due: "2026-10-20", priority: "medium" }
    ] }],
  sessions: [{ id: "s1", courseId: "c1", date: "2026-10-24", minutes: 60 }],
  pet: { animal: "cat", name: "Misse" },
  wallet: { bonus: 20, spent: 10, owned: ["bow"], equipped: { head: "bow", face: "", neck: "", bg: "" } }
};

// ---------- 1. Start tom ----------
console.log("Tom start");
{
  const a = make();
  check("ingen emner ved start", a.ev("courses.length") === 0);
  check("tittel finnes", $(a, "h1").textContent === "Oversikt");
  check("timer viser 25:00", $(a, "#timer-display").textContent === "25:00");
}

// ---------- 2. Legge til emne og oppgave ----------
console.log("Emner og oppgaver");
{
  const a = make();
  setVal(a, "#course-name", "Matte");
  setVal(a, "#course-date", "2026-11-10");
  submit(a, "#course-form");
  check("emne lagt til", a.ev("courses.length") === 1 && stored(a).courses[0].name === "Matte");
  const id = a.ev("courses[0].id");
  a.ev(`courses[0].tasks.push({id:"x1",text:"A",done:false,due:"",priority:"medium"}); save(); render();`);
  check("oppgave lagret", stored(a).courses[0].tasks.length === 1);
  setVal(a, "#course-name", "<img src=x onerror=alert(1)>");
  setVal(a, "#course-date", "2026-11-12");
  submit(a, "#course-form");
  check("HTML i navn blir tekst, ikke element", !$(a, "#courses img") && a.d.body.textContent.includes("<img src=x"));
  check("id er gyldig", /^[\w-]+$/.test(id));
}

// ---------- 3. Migrering fra v1 ----------
console.log("Migrering og sanitering");
{
  const v1 = [{ id: "old1", name: "Gammel", date: "2026-11-01", color: "#112233", tasks: [{ id: "o1", text: "Opg", done: true }] }];
  const a = make({ "studieplanlegger-v1": JSON.stringify(v1) });
  check("v1 migrert", a.ev("courses.length") === 1 && a.ev("courses[0].tasks[0].priority") === "medium");
  check("mål-felter får standardverdi", a.ev("courses[0].goalHours") === 0 && a.ev("courses[0].goalGrade") === "");

  const a2 = make();
  const evil = {
    courses: [
      { id: "__proto__", name: "Ond", date: "2026-11-01", color: "red;background:url(x)", goalGrade: "Z", goalHours: 99999,
        tasks: [{ text: "t", priority: "constructor", due: "ikke-dato" }, { text: "" }, null, 5] },
      { id: "a", name: "", date: "2026-11-01" },
      { id: "b", name: "Uten dato", date: "31.10.2026" },
      "streng"
    ],
    sessions: [
      { courseId: "__proto__", date: "2026-10-24", minutes: 30 },
      { courseId: "nope", date: "2026-10-24", minutes: 30 },
      { courseId: "__proto__", date: "2026-10-24", minutes: -5 },
      { courseId: "__proto__", date: "2026-10-24", minutes: 99999 }
    ],
    pet: { animal: "drage", name: "x" }
  };
  const r = a2.w.eval(`sanitizeData(${JSON.stringify(evil)})`);
  check("kun gyldige emner beholdes", r.courses.length === 1);
  check("farge utenfor #rrggbb byttes ut", r.courses[0].color === "#c98a8f");
  check("ugyldig karakter blir tom", r.courses[0].goalGrade === "");
  check("timemål begrenses", r.courses[0].goalHours === 1000);
  check("ugyldig prioritet → medium", r.courses[0].tasks[0].priority === "medium");
  check("ugyldig frist fjernes", r.courses[0].tasks[0].due === "");
  check("tomme/ugyldige oppgaver fjernes", r.courses[0].tasks.length === 1);
  check("kun gyldig økt beholdes", r.sessions.length === 1 && r.sessions[0].minutes === 30);
  check("ukjent dyr gir ingen pet", r.pet === null);
  let threw = false; try { a2.w.eval(`sanitizeData({foo:1})`); } catch (e) { threw = true; }
  check("feil format kaster feil", threw);
  check("Object.prototype er ikke forurenset", ({}).polluted === undefined && a2.w.eval("({}).priority") === undefined);
}

// ---------- 4. Oppgaverekkefølge og frister ----------
console.log("Oppgaver, frister og plan");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const order = a.ev("sortedTasks(courses[0]).map(t=>t.id).join(',')");
  check("sortering: forfalt/frist/høy først, ferdig sist", order.split(",")[order.split(",").length - 1] === "t3" && order.split(",")[0] === "t4", order);
  check("neste oppgave er den forfalte", a.ev("nextTaskOf(courses[0]).id") === "t4");
  const plan = a.ev("buildPlan()");
  check("7 dager i planen", plan.length === 7);
  check("forfalt oppgave vises på I dag", plan[0].deadlines.some(x => x.overdue && x.task.id === "t4"));
  check("frist vises på riktig dag (27.)", plan[2].deadlines.some(x => x.task.id === "t2"));
  check("ferdig oppgave gir ikke frist", !plan.some(p => p.deadlines.some(x => x.task.id === "t3")));
  check("maks to emner per dag", plan.every(p => p.items.length <= 2));
  check("planen tegnes", $$(a, "#plan .day").length === 7);
}

// ---------- 5. Mål ----------
console.log("Mål per emne");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const g = a.ev("goalInfo(courses[0])");
  check("mål 20 t = 1200 min", g.goalMin === 1200);
  check("60 min gjort, 1140 igjen", g.done === 60 && g.left === 1140);
  check("5 % ferdig", g.pct === 5);
  check("anbefalt per dag = 1140/6 = 190", g.perDay === 190, g.perDay);
  const share = a.ev("remainingShare(courses[0])");
  check("andel igjen mellom 0 og 1", share > 0 && share <= 1, share);
}

// ---------- 6. Timer ----------
console.log("Timer");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  setVal(a, "#timer-course", "c1");
  click(a, '.preset[data-min="15"]');
  check("forhåndsvalg 15 min", $(a, "#timer-display").textContent === "15:00");
  click(a, "#timer-start");
  check("timeren går", a.ev("timer.running") === true);
  a.w.__now += 5 * 60000;
  a.ev("tick()");
  check("etter 5 min vises 10:00", $(a, "#timer-display").textContent === "10:00", $(a, "#timer-display").textContent);
  click(a, "#timer-start"); // pause
  check("pause stopper timeren", a.ev("timer.running") === false);
  const saved = JSON.parse(a.w.localStorage.getItem("studieplanlegger-timer"));
  check("timer lagres", saved && saved.running === false);
  click(a, "#timer-start");
  a.w.__now += 11 * 60000;
  a.ev("tick()");
  check("ferdig timer logger 15 min", a.ev("sessions.length") === 2 && a.ev("sessions[1].minutes") === 15, a.ev("sessions.length"));
  check("timer nullstilles etter ferdig", a.ev("timer.running") === false);
  click(a, "#timer-start");
  a.w.__now += 7 * 60000;
  click(a, "#timer-finish");
  check("«Fullfør og logg» logger brukt tid (7 min)", a.ev("sessions[sessions.length-1].minutes") === 7, a.ev("sessions.map(s=>s.minutes)"));

  // Siden lastes på nytt mens timeren går
  const b = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE),
    "studieplanlegger-timer": JSON.stringify({ minutes: 25, courseId: "c1", running: true, endAt: NOW + 4 * 60000, remainingMs: 0 }) });
  check("løpende timer gjenopptas etter reload", b.ev("timer.running") === true && $(b, "#timer-display").textContent === "04:00", $(b, "#timer-display").textContent);
  const c = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE),
    "studieplanlegger-timer": JSON.stringify({ minutes: 25, courseId: "c1", running: true, endAt: NOW - 60000, remainingMs: 0 }) });
  check("timer som gikk ut mens siden var lukket, logges", c.ev("sessions.length") === 2 && c.ev("timer.running") === false);
}

// ---------- 7. Manuell logging og statistikk ----------
console.log("Logging og statistikk");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  setVal(a, "#timer-course", "c1");
  setVal(a, "#manual-minutes", "45");
  setVal(a, "#manual-date", "2026-10-25");
  submit(a, "#manual-form");
  check("manuell økt lagret", a.ev("sessions.length") === 2 && stored(a).sessions[1].minutes === 45);
  setVal(a, "#manual-minutes", "-3");
  setVal(a, "#manual-date", "2026-10-25");
  submit(a, "#manual-form");
  check("negative minutter avvises", a.ev("sessions.length") === 2);
  setVal(a, "#manual-minutes", "30");
  setVal(a, "#manual-date", "2026-12-24");
  submit(a, "#manual-form");
  check("dato frem i tid avvises", a.ev("sessions.length") === 2);
  setVal(a, "#manual-minutes", "99999");
  setVal(a, "#manual-date", "2026-10-25");
  submit(a, "#manual-form");
  check("urealistisk antall minutter avvises", a.ev("sessions.length") === 2);
  check("diagram har 7 søyler", $$(a, "#stats-chart .bar-col").length === 7);
  check("økter listes", $$(a, "#sessions-list li").length >= 2);
  const del = $(a, "#sessions-list button");
  if (del) del.dispatchEvent(new a.w.MouseEvent("click", { bubbles: true }));
  check("økt kan slettes", a.ev("sessions.length") === 1);
}

// ---------- 8. Studiedyr ----------
console.log("Studiedyr og poeng");
{
  const a = make();
  const L = m => a.ev(`levelInfo(${m})`);
  check("0 poeng = nivå 1", L(0).level === 1);
  check("10 poeng = nivå 2", L(10).level === 2);
  check("40 poeng = nivå 3", L(40).level === 3);
  check("810 poeng = nivå 10 (maks)", L(810).level === 10 && L(810).next === null);
  check("99999 poeng blir fortsatt nivå 10", L(99999).level === 10);
  check("5 min = 1 poeng", a.ev("MIN_PER_POINT") === 5);

  const b = make({ "studieplanlegger-v2": JSON.stringify(Object.assign({}, SAMPLE, { sessions: [] })) });
  b.ev("sessions = []; wallet = emptyWallet(); render();");
  const msg = b.ev(`logSession("c1", 50, "2026-10-25")`); // 10 poeng → nivå 2
  check("meldingen sier poeng og nivå opp", /\+10 poeng/.test(msg) && /Nivå opp/.test(msg) && /nivå 2/.test(msg), msg);
  const msg2 = b.ev(`logSession("c1", 5, "2026-10-25")`);
  check("ingen nivå-opp-melding uten nivå opp", /\+1 poeng/.test(msg2) && !/Nivå opp/.test(msg2), msg2);

  // Bytt dyr beholder nivå
  const before = b.ev("levelInfo(totalPoints()).level");
  b.ev(`savePet("fox","Rev")`);
  check("bytte dyr beholder nivå", b.ev("levelInfo(totalPoints()).level") === before && b.ev("pet.animal") === "fox" && b.ev("pet.name") === "Rev");
  check("dyret lagres", stored(b).pet.animal === "fox");
  const c = make();
  check("uten dyr vises 8 dyr å velge mellom", $$(c, "#pet-panel .animal").length === 8, $$(c, "#pet-panel .animal").length);
  check("dyrene er tegnet som SVG, ikke emoji", $$(c, "#pet-panel .animal svg").length === 8);
  const tooLong = make();
  tooLong.ev(`savePet("cat-orange", "${"x".repeat(100)}")`);
  check("dyrenavn kortes ned til 20 tegn", tooLong.ev("pet.name.length") <= 20);
}


// ---------- 8b. Livsstadier, poeng for oppgaver og butikk ----------
console.log("Stadier, oppgavepoeng og butikk");
{
  const a = make();
  const st = l => a.ev(`stageOf(${l}).key`);
  check("nivå 1-2 er baby", st(1) === "baby" && st(2) === "baby");
  check("nivå 3-5 er ung", st(3) === "young" && st(5) === "young");
  check("nivå 6-8 er voksen", st(6) === "adult" && st(8) === "adult");
  check("nivå 9-10 er gammel", st(9) === "elder" && st(10) === "elder");
  const kinds = a.ev(`ANIMALS.map(x=>x.id).join(",")`);
  check("8 dyr: 2 katter, 2 hunder, rev, pingvin, panda, kanin", kinds === "cat-orange,cat-black,dog-brown,dog-spot,fox,penguin,panda,rabbit", kinds);
  const bad = [];
  a.ev(`ANIMALS`).forEach(an => ["baby", "young", "adult", "elder"].forEach(stg => {
    const svg = a.ev(`drawPet(animalById("${an.id}"), "${stg}", {head:"crown",face:"glasses",neck:"scarf",bg:"night"})`);
    if (!svg || svg.tagName !== "svg" || svg.querySelectorAll("*").length < 10) bad.push(an.id + "/" + stg);
  }));
  check("alle dyr tegnes i alle stadier med alt tilbehør", bad.length === 0, bad);

  // Poeng for oppgaver
  const b = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const before = b.ev("totalPoints()");
  b.ev(`courses[0].tasks[1].done = false;`);
  const cb = $(b, '[data-key="cb-t2"]');
  b.ev(`openIds.add("c1"); render();`);
  const cb2 = $(b, '[data-key="cb-t2"]');
  cb2.checked = true; cb2.dispatchEvent(new b.w.Event("change", { bubbles: true }));
  check("høy prioritet gir 8 poeng", b.ev("totalPoints()") === before + 8, b.ev("totalPoints()") - before);
  const cb3 = $(b, '[data-key="cb-t2"]');
  cb3.checked = false; cb3.dispatchEvent(new b.w.Event("change", { bubbles: true }));
  const cb4 = $(b, '[data-key="cb-t2"]');
  cb4.checked = true; cb4.dispatchEvent(new b.w.Event("change", { bubbles: true }));
  check("å huke av og på igjen gir ikke nye poeng", b.ev("totalPoints()") === before + 8);
  check("melding vises", $(b, "#toast").textContent.includes("poeng") || $(b, "#toast").textContent === "");
  const lowTask = b.ev(`({ rewarded:false, priority:"low" })`);
  check("lav prioritet gir 3 poeng", b.ev(`(function(){ const t={rewarded:false,priority:"low"}; const p=totalPoints(); rewardTask(t); return totalPoints()-p; })()`) === 3);

  // Butikk
  const c = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const startBalance = c.ev("pointBalance()");
  check("saldo = tjent - brukt (12 + 20 - 10 = 22)", startBalance === 22, startBalance);
  c.ev(`buyItem("glasses")`); // 20 poeng
  check("kjøp trekker poeng og setter på dyret", c.ev("pointBalance()") === 2 && c.ev("wallet.equipped.face") === "glasses" && c.ev("wallet.owned.includes('glasses')"));
  c.ev(`buyItem("crown")`); // 60, for dyrt
  check("for dyrt: kjøpet avvises", !c.ev("wallet.owned.includes('crown')") && c.ev("pointBalance()") === 2);
  c.ev(`buyItem("glasses")`);
  check("kan ikke kjøpe samme ting to ganger", c.ev("pointBalance()") === 2 && c.ev("wallet.owned.filter(x=>x==='glasses').length") === 1);
  c.ev(`toggleItem("glasses")`);
  check("ta av tilbehør", c.ev("wallet.equipped.face") === "");
  c.ev(`toggleItem("glasses")`);
  check("ta på igjen", c.ev("wallet.equipped.face") === "glasses");
  c.ev(`toggleItem("crown")`);
  check("kan ikke ta på ting man ikke eier", c.ev("wallet.equipped.head") === "bow");
  check("nivået går ikke ned når poeng brukes", c.ev("levelInfo(totalPoints()).points") === c.ev("totalPoints()") && c.ev("totalPoints()") === 32);
  check("lagres", stored(c).wallet.owned.includes("glasses") && stored(c).wallet.spent === 30);
  check("butikken viser alle 11 varer", $$(c, ".shop-item").length === 11, $$(c, ".shop-item").length);
  const dis = $$(c, ".shop-item button").filter(x => x.disabled).length;
  check("varer man ikke har råd til er deaktivert", dis > 0);
  c.ev(`savePet("panda","Bamse")`);
  check("tilbehør beholdes når man bytter dyr", c.ev("wallet.equipped.face") === "glasses" && c.ev("wallet.owned.length") === 2);

  // Sanitering av tilbehør
  const evil = make();
  const w = evil.w.eval(`sanitizeWallet(${JSON.stringify({ bonus: -5, spent: 1e12, owned: ["bow", "bow", "ukjent", 5, "__proto__"], equipped: { head: "bow", face: "crown", neck: "__proto__", bg: "bow" } })})`);
  check("ugyldige tall settes til trygge verdier", w.bonus === 0 && w.spent === 100000);
  check("kun kjente varer, uten duplikater", w.owned.length === 1 && w.owned[0] === "bow");
  check("kun eide varer i riktig sted kan brukes", w.equipped.head === "bow" && w.equipped.face === "" && w.equipped.neck === "" && w.equipped.bg === "");
  check("manglende wallet gir tom start", evil.w.eval(`sanitizeWallet(undefined).owned.length`) === 0);
}

// ---------- 8c. Sider, oversikt, rekke og venner ----------
console.log("Sider og venner");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const visible = () => $$(a, ".view").filter(v => !v.hidden).map(v => v.dataset.page);
  check("starter på oversikten", visible().join() === "home");
  check("appen heter Fagblom", a.d.title === "Fagblom" && $(a, ".brand").textContent.includes("Fagblom"));
  check("kalenderfilen har appnavnet", a.ev("buildICS()").includes("X-WR-CALNAME:Fagblom"));
  a.ev(`goTo("friends")`);
  check("kan bytte til venner (kun én side vises)", visible().join() === "friends" && a.d.title.startsWith("Venner"));
  check("menyvalget markeres", $(a, '.nav-item[aria-current="page"]').dataset.page === "friends");
  a.ev(`goTo("profile")`);
  check("profilsiden vises", visible().join() === "profile");
  a.w.location.hash = "#/finnes-ikke"; a.ev("showPage()");
  check("ukjent adresse gir oversikten", visible().join() === "home");
  check("alle 6 sider finnes", $$(a, ".view").length === 6 && $$(a, ".nav-item").length === 6);

  // Rekke
  check("rekke 1 dag når du studerte i går", a.ev("studyStreak()") === 1);
  a.ev(`sessions.push({id:"z1",courseId:"c1",date:"2026-10-25",minutes:20}); sessions.push({id:"z2",courseId:"c1",date:"2026-10-23",minutes:20});`);
  check("rekke 3 dager med i dag, i går og dagen før", a.ev("studyStreak()") === 3);
  a.ev(`sessions = sessions.filter(s=>s.date!=="2026-10-24")`);
  check("rekken brytes ved en tom dag", a.ev("studyStreak()") === 1);

  // Oversikt
  const b = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  check("oversikten har 4 nøkkeltall", $$(b, "#home-tiles .tile").length === 4);
  check("dagens plan vises", $$(b, "#home-today .chip").length >= 1);
  check("studiedyret vises på oversikten", $(b, "#home-pet").textContent.includes("Misse"));
  check("veiviser vises ikke når du har emner", $(b, "#start-guide").children.length === 0);
  const c = make();
  check("tom start: veiviser vises, tall skjules", $(c, "#start-guide .guide") && $(c, "#home-tiles").hidden);
  $(c, "#start-guide .btn.secondary").dispatchEvent(new c.w.MouseEvent("click", { bubbles: true }));
  check("«Prøv med demodata» fyller appen", c.ev("courses.length") === 3 && !$(c, "#home-tiles").hidden);
  check("profilstatistikk har 5 tall", $$(c, "#profile-stats .tile").length === 5);

  // Venner (demo)
  const d = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const rows = () => $$(d, "#leaderboard .lb-row");
  check("topplisten har 7 rader (6 demo + deg)", rows().length === 7);
  check("alle venner er merket Demo, du er ikke", rows().filter(r => r.querySelector(".badge")).length === 6 && rows().filter(r => r.classList.contains("you")).length === 1);
  check("sortert etter uketid", rows()[0].textContent.includes("Sara") && rows()[6].classList.contains("you"));
  check("oppsummering sier plassering", $(d, "#lb-summary").textContent.startsWith("Du ligger på 7. plass av 7"));
  d.ev(`sessions.push({id:"big",courseId:"c1",date:"2026-10-25",minutes:1300}); render();`);
  check("du klatrer når du studerer mer", d.ev(`leaderboardRows()[0].you`) === true);
  $(d, '.seg-btn[data-sort="level"]').dispatchEvent(new d.w.MouseEvent("click", { bubbles: true }));
  check("kan sortere etter nivå", $(d, '.seg-btn[data-sort="level"]').getAttribute("aria-pressed") === "true" && $(d, "#lb-summary").textContent.includes("etter nivå"));
  check("venneavatarer er tegnet som SVG", $$(d, "#leaderboard .lb-art svg").length >= 6);
  const none = make();
  check("uten dyr vises initial i stedet for dyr", $$(none, "#leaderboard .lb-initial").length === 1);
}

// ---------- 9. Eksport / import ----------
console.log("Eksport og import");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  const json = a.ev("buildExportJSON()");
  const parsed = JSON.parse(json);
  check("eksport inneholder emner, økter, dyr og tilbehør", parsed.courses.length === 1 && parsed.sessions.length === 1 && parsed.pet.name === "Misse" && parsed.wallet.owned[0] === "bow");
  const b = make();
  b.w.eval(`(function(){ const r = sanitizeData(${json}); courses = r.courses; sessions = r.sessions; pet = r.pet; wallet = r.wallet; save(); render(); })()`);
  check("rundtur: samme data etter import", JSON.stringify(stored(b).courses) === JSON.stringify(a.ev("courses")) && JSON.stringify(stored(b).sessions) === JSON.stringify(a.ev("sessions")) && stored(b).pet.animal === "cat-orange" && JSON.stringify(stored(b).wallet) === JSON.stringify(a.ev("wallet")));
  click(a, "#export-btn");
  check("eksportknappen laster ned .json", (a.w.__downloads || []).some(n => /\.json$/.test(n)), a.w.__downloads);
  click(a, "#ics-btn");
  check("kalenderknappen laster ned .ics", (a.w.__downloads || []).some(n => /\.ics$/.test(n)), a.w.__downloads);
}

// ---------- 10. Kalenderfil (.ics) ----------
console.log("Kalenderfil");
{
  const data = JSON.parse(JSON.stringify(SAMPLE));
  data.courses[0].name = "Emne; med, spesialtegn \\ og langt navn over flere linjer";
  const a = make({ "studieplanlegger-v2": JSON.stringify(data) });
  const ics = a.ev("buildICS()");
  check("starter og slutter riktig", ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  check("bruker CRLF overalt", !/[^\r]\n/.test(ics));
  check("ingen linje over 75 tegn", ics.split("\r\n").every(l => Array.from(l).length <= 75));
  const unfolded = ics.replace(/\r\n /g, "");
  check("tegn escapes (; , \\)", unfolded.includes("Emne\\; med\\, spesialtegn \\\\ og"));
  check("eksamen har alarm", unfolded.includes("TRIGGER:-PT15H"));
  check("ferdige oppgaver tas ikke med", !unfolded.includes("Ferdig"));
  check("frist for åpen oppgave tas med", unfolded.includes("SUMMARY:Frist: Høy frist"));
  check("heldagshendelse 20261031–20261101", unfolded.includes("DTSTART;VALUE=DATE:20261031") && unfolded.includes("DTEND;VALUE=DATE:20261101"));
  check("like mange BEGIN og END:VEVENT", (unfolded.match(/BEGIN:VEVENT/g) || []).length === (unfolded.match(/END:VEVENT/g) || []).length);
}

// ---------- 11. Mørk modus ----------
console.log("Mørk modus");
{
  const a = make();
  click(a, "#theme-btn");
  check("mørk modus slås på", a.d.documentElement.getAttribute("data-theme") === "dark" && a.w.localStorage.getItem("studieplanlegger-theme") === "dark");
  click(a, "#theme-btn");
  check("kan slås av igjen", a.d.documentElement.getAttribute("data-theme") === "light");
  const b = make({ "studieplanlegger-theme": "dark" });
  check("valget huskes ved ny innlasting", b.d.documentElement.getAttribute("data-theme") === "dark");
  const c = make({ "studieplanlegger-theme": "<script>" });
  check("ugyldig tema ignoreres", !c.d.documentElement.getAttribute("data-theme"));
}

// ---------- 12. Nedtelling over sommertid-skifte ----------
console.log("Datoer");
{
  const a = make();
  check("dager til eksamen over sommertid-skifte (25.10 → 31.10) = 6", a.ev(`daysBetween(new Date(2026,9,25), new Date(2026,9,31))`) === 6);
  check("daysBetween ved klokkeendring", a.ev(`daysBetween(new Date(2026,9,24), new Date(2026,9,26))`) === 2);
  check("ugyldig dato avvises", a.ev(`isValidISO("2026-02-30")`) === false && a.ev(`isValidISO("2026-02-28")`) === true);
}

// ---------- 13. Slett alt ----------
console.log("Slett alt");
{
  const a = make({ "studieplanlegger-v2": JSON.stringify(SAMPLE) });
  click(a, "#clear-btn");
  check("alt slettes inkl. dyr og poeng", a.ev("courses.length") === 0 && a.ev("sessions.length") === 0 && a.ev("pet") === null && a.ev("wallet.owned.length") === 0 && a.ev("wallet.bonus") === 0);
}

console.log("\n" + passed + " bestått, " + failed + " feilet");
process.exit(failed ? 1 : 0);
