const AI = {
  delay(ms) { return new Promise(resolve=>setTimeout(resolve,ms)); },
  alive(s) { return Game.state===s && s.active && s.turn==='enemy'; },

  chooseTarget(def,level) {
    const s=Game.state, enemy=s.player, mine=s.enemy;
    const foes=enemy.board.map((m,i)=>m?{who:'player',slot:i,m}:null).filter(Boolean);
    const friends=mine.board.map((m,i)=>m?{who:'enemy',slot:i,m}:null).filter(Boolean);
    if (def.type==='minion') return null;
    if (def.effect==='buff') {
      if (!friends.length) return null;
      const pick=level==='easy'?friends[Math.floor(Math.random()*friends.length)]:friends.sort((a,b)=>b.m.atk-a.m.atk)[0];
      return {who:'enemy',slot:pick.slot};
    }
    if (def.effect==='bounce' || def.effect==='weaken') {
      if (!foes.length) return null;
      const pick=level==='easy'?foes[Math.floor(Math.random()*foes.length)]:foes.sort((a,b)=>(b.m.atk+b.m.hp)-(a.m.atk+a.m.hp))[0];
      return {who:'player',slot:pick.slot};
    }
    if (def.effect==='damage') {
      const valid=foes.filter(f=>Game.validTarget('enemy',{who:'player',slot:f.slot},false));
      const hero={who:'player',hero:true};
      if (level==='hard' && enemy.hp<=def.value) return hero;
      if (level!=='easy') {
        const kill=valid.filter(f=>f.m.hp<=def.value).sort((a,b)=>b.m.atk-a.m.atk)[0];
        if (kill && (level==='hard' || Math.random()<0.7)) return {who:'player',slot:kill.slot};
      }
      const choices=[...valid.map(f=>({who:'player',slot:f.slot})),hero];
      return choices[Math.floor(Math.random()*choices.length)] || null;
    }
    return null;
  },

  chooseAttack(slot,level) {
    const s=Game.state,m=s.enemy.board[slot],e=s.player;
    if (!m) return null;
    const choices=[];
    for (let i=0;i<6;i++) if (e.board[i] && Game.validTarget('enemy',{who:'player',slot:i}))
      choices.push({who:'player',slot:i,def:e.board[i]});
    if (Game.validTarget('enemy',{who:'player',hero:true})) choices.push({who:'player',hero:true});
    if (!choices.length) return null;
    if (level==='easy') return choices[Math.floor(Math.random()*choices.length)];
    const hero=choices.find(x=>x.hero);
    if (hero && e.hp<=m.atk) return hero;
    const score=choice=>{
      if (choice.hero) return 2;
      const d=choice.def,shield=d.barrier;
      const kill=!shield && d.hp<=m.atk;
      const survives=m.barrier || m.hp>d.atk;
      const splash=CARD_MAP[m.id].cleave?[choice.slot-1,choice.slot+1]
        .filter(i=>i>=0 && i<6 && e.board[i]).reduce((sum,i)=>sum+(e.board[i].barrier?1:e.board[i].hp===1?4:2),0):0;
      return (kill?d.atk+4:shield?3:Math.min(m.atk,d.hp)) + splash + (survives?2:-3);
    };
    const trades=choices.filter(x=>x.def).sort((a,b)=>score(b)-score(a));
    if (trades.length && (level==='hard' || Math.random()<0.7) && score(trades[0])>score(hero||{hero:true})) return trades[0];
    return hero || trades[0];
  },

  async takeTurn() {
    const s=Game.state;
    if (!this.alive(s)) return;
    const level=s.difficulty;
    const accuracy={easy:0.5,normal:0.7,hard:0.9}[level];
    const played=new Set();
    let attempts=0;
    while (this.alive(s) && attempts<8) {
      const p=s.enemy;
      const available=p.hand.filter(c=>!played.has(c.uid) && Game.canBegin('enemy',c));
      if (!available.length) break;
      available.sort((a,b)=>level==='easy'?Math.random()-0.5:CARD_MAP[b.id].cost-CARD_MAP[a.id].cost);
      const card=available[0],def=CARD_MAP[card.id];
      played.add(card.uid); attempts++;
      let slot=null,target=null;
      if (def.type==='minion') slot=p.board.findIndex(x=>!x);
      else target=this.chooseTarget(def,level);
      if (!Game.canPlay('enemy',card,slot,target)) continue;
      await this.delay(650);
      if (!this.alive(s)) return;
      const correct=Math.random()<accuracy;
      UI.toast(`Соперник: ${def.hanzi} — ${correct?'верно ✓':'ошибка ✗'}`,correct?'good':'bad');
      if (!correct) { card.locked=true; UI.render(); continue; }
      Game.playCard('enemy',card,slot,target);
      Sound.play('play'); UI.render();
      if (!this.alive(s)) return;
    }
    const slots=s.enemy.board.map((m,i)=>m&&m.ready&&m.attacksLeft?i:null).filter(x=>x!==null);
    for (const slot of slots) {
      if (!this.alive(s)) return;
      const target=this.chooseAttack(slot,level);
      if (!target || !Game.canAttack('enemy',slot,target)) continue;
      await this.delay(550);
      if (!this.alive(s)) return;
      await Game.attack('enemy',slot,target);
      if (!this.alive(s)) return;
    }
    await this.delay(550);
    if (this.alive(s)) Game.finishAITurn();
  }
};
