const Game = {
  state: null,
  timerId: null,
  uid: 0,
  onEvent: null,

  emit(type, data={}) { if (this.onEvent) this.onEvent(type, data); },
  side(who) { return this.state[who]; },
  other(who) { return who === 'player' ? 'enemy' : 'player'; },
  nextUid() { return ++this.uid; },

  start(difficulty) {
    this.stop();
    this.uid = 0;
    const mkSide = () => ({hp:30, mana:0, maxMana:0, board:Array(6).fill(null), hand:[], deck:makeDeck(), fatigue:0});
    this.state = {player:mkSide(),enemy:mkSide(),turn:'player',active:true,busy:false,
      difficulty, startedAt:Date.now(), turnStartedAt:0, turnNumber:0, matchStats:{}};
    for (let i=0;i<3;i++) { this.draw('player'); this.draw('enemy'); }
    this.startTurn('player');
    if (!this.state.active) return;
    this.timerId = setInterval(() => this.tick(), 100);
    this.emit('started');
  },

  stop() {
    if (this.timerId) { clearInterval(this.timerId); this.timerId=null; }
    if (this.state) this.state.active=false;
  },

  tick() {
    const s=this.state;
    if (!s || !s.active) return;
    const elapsed=Date.now()-s.startedAt;
    if (elapsed>=600000) {
      const result=s.player.hp>s.enemy.hp?'player':s.player.hp<s.enemy.hp?'enemy':'draw';
      this.finish(result,'Время вышло'); return;
    }
    this.emit('tick',{remaining:600000-elapsed,turnRemaining:Math.max(0,60000-(Date.now()-s.turnStartedAt))});
    if (Date.now()-s.turnStartedAt>=60000 && !s.busy) {
      this.emit('turnTimeout',{who:s.turn});
      if (s.turn==='player') this.endPlayerTurn();
      else this.finishAITurn();
    }
  },

  startTurn(who) {
    const s=this.state;
    if (!s.active) return;
    s.turn=who; s.busy=false; s.turnStartedAt=Date.now(); s.turnNumber++;
    const p=s[who];
    p.maxMana=Math.min(10,p.maxMana+1); p.mana=p.maxMana;
    p.hand.forEach(c => c.locked=false);
    p.board.forEach(m => { if (m) { m.ready=true; m.attacksLeft=1; } });
    this.draw(who);
    if (!s.active) return;
    this.emit('turnStart',{who});
  },

  endPlayerTurn() {
    const s=this.state;
    if (!s?.active || s.turn!=='player') return;
    this.startTurn('enemy');
    if (s.active) setTimeout(() => {
      if (this.state===s && s.active && s.turn==='enemy') AI.takeTurn();
    },500);
  },

  finishAITurn() {
    const s=this.state;
    if (!s?.active || s.turn!=='enemy') return;
    this.startTurn('player');
  },

  draw(who) {
    const s=this.state; if (!s?.active) return;
    const p=s[who];
    if (!p.deck.length) {
      p.fatigue++;
      this.damageHero(who,p.fatigue,'fatigue');
      this.emit('fatigue',{who,amount:p.fatigue}); return;
    }
    const id=p.deck.pop();
    if (p.hand.length>=8) { this.emit('burn',{who,id}); return; }
    p.hand.push({uid:this.nextUid(),id,locked:false});
    this.emit('draw',{who,id});
  },

  canPlay(who,card,slot=null,target=null) {
    const s=this.state; if (!s?.active || s.turn!==who || s.busy) return false;
    const p=s[who];
    if (!p.hand.includes(card) || card.locked) return false;
    const def=CARD_MAP[card.id];
    if (def.cost>p.mana) return false;
    if (def.type==='minion') return Number.isInteger(slot) && slot>=0 && slot<6 && !p.board[slot];
    if (def.effect==='damage') return target !== null && this.validTarget(who,target,false);
    if (def.effect==='bounce' || def.effect==='weaken') return target?.who===this.other(who) && Number.isInteger(target.slot) && !!s[target.who].board[target.slot];
    if (def.effect==='buff') return target?.who===who && Number.isInteger(target.slot) && !!p.board[target.slot];
    return true;
  },

  canBegin(who,card) {
    const s=this.state; if (!s?.active || s.turn!==who || s.busy) return false;
    const p=s[who];
    if (!p.hand.includes(card) || card.locked || CARD_MAP[card.id].cost>p.mana) return false;
    const def=CARD_MAP[card.id];
    if (def.type==='minion') return p.board.some(x=>!x);
    if (def.effect==='bounce' || def.effect==='weaken') return s[this.other(who)].board.some(Boolean);
    if (def.effect==='buff') return p.board.some(Boolean);
    return true;
  },

  validTarget(who,target,melee=true) {
    if (!target || target.who!==this.other(who)) return false;
    const e=this.side(target.who);
    if (target.hero) return !melee || !e.board.some(m=>m?.taunt);
    if (!Number.isInteger(target.slot) || target.slot<0 || target.slot>=6 || !e.board[target.slot]) return false;
    return !melee || !e.board.some(m=>m?.taunt) || !!e.board[target.slot].taunt;
  },

  playCard(who,card,slot=null,target=null) {
    if (!this.canPlay(who,card,slot,target)) return false;
    const s=this.state,p=s[who],def=CARD_MAP[card.id];
    p.mana-=def.cost; p.hand.splice(p.hand.indexOf(card),1);
    if (def.type==='minion') {
      p.board[slot]={uid:this.nextUid(),id:def.id,atk:def.atk,hp:def.hp,maxHp:def.hp,
        taunt:!!def.taunt,barrier:!!def.barrier,ready:!!def.charge,attacksLeft:def.charge?1:0};
    } else this.applyEffect(who,def,target);
    this.emit('play',{who,card:def,slot,target});
    this.checkEnd();
    return true;
  },

  applyEffect(who,def,target) {
    const s=this.state,p=s[who],e=s[this.other(who)],v=def.value;
    switch(def.effect) {
      case 'draw': for (let i=0;i<v && s.active;i++) this.draw(who); break;
      case 'heal': {
        const old=p.hp; p.hp=Math.min(30,p.hp+v);
        this.emit('heal',{who,amount:p.hp-old}); break;
      }
      case 'mana': p.mana=Math.min(10,p.mana+v); break;
      case 'aoe': {
        for (let i=0;i<6;i++) if (e.board[i]) this.damageMinion(this.other(who),i,v);
        this.damageHero(this.other(who),v); break;
      }
      case 'damage': {
        if (target.hero) this.damageHero(target.who,v);
        else this.damageMinion(target.who,target.slot,v); break;
      }
      case 'bounce': {
        const m=e.board[target.slot]; e.board[target.slot]=null;
        if (e.hand.length<8) e.hand.push({uid:this.nextUid(),id:m.id,locked:false});
        this.emit('bounce',{who:target.who,slot:target.slot}); break;
      }
      case 'weaken': {
        const m=e.board[target.slot]; m.atk=Math.max(0,m.atk-v);
        this.emit('weaken',{who:target.who,slot:target.slot}); break;
      }
      case 'buff': {
        const m=p.board[target.slot]; m.atk+=v; m.hp+=v; m.maxHp+=v;
        this.emit('buff',{who,slot:target.slot}); break;
      }
    }
  },

  damageHero(who,amount,kind='dmg') {
    if (!this.state?.active) return;
    const p=this.side(who); p.hp=Math.max(0,p.hp-amount);
    this.emit('damage',{who,hero:true,amount,kind});
    this.checkEnd();
  },

  damageMinion(who,slot,amount,kind='dmg') {
    const p=this.side(who),m=p.board[slot]; if (!m || amount<=0) return;
    if (m.barrier) {
      m.barrier=false;
      this.emit('barrierBreak',{who,slot});
      return;
    }
    m.hp-=amount;
    this.emit('damage',{who,slot,amount,hero:false,kind});
    if (m.hp<=0) { this.emit('death',{who,slot}); p.board[slot]=null; }
  },

  canAttack(who,slot,target) {
    const s=this.state;
    if (!s?.active || s.turn!==who || s.busy) return false;
    if (!Number.isInteger(slot) || slot<0 || slot>=6) return false;
    const m=s[who].board[slot];
    return !!(m && m.ready && m.attacksLeft>0 && m.atk>0 && this.validTarget(who,target));
  },

  async attack(who,slot,target) {
    if (!this.canAttack(who,slot,target)) return false;
    const s=this.state,actor=s[who].board[slot];
    s.busy=true; actor.attacksLeft--;
    this.emit('attackStart',{who,slot,target});
    await new Promise(resolve=>setTimeout(resolve,420));
    if (this.state!==s || !s.active) return false;
    const m=s[who].board[slot];
    if (!m || m.uid!==actor.uid) { s.busy=false; return false; }
    if (target.hero) this.damageHero(target.who,m.atk);
    else {
      const defender=s[target.who].board[target.slot];
      if (defender) {
        const counter=defender.atk;
        this.damageMinion(target.who,target.slot,m.atk);
        if (s.active) this.damageMinion(who,slot,counter);
        if (s.active && CARD_MAP[m.id].cleave) {
          for (const adjacent of [target.slot-1,target.slot+1]) {
            if (adjacent>=0 && adjacent<6 && s[target.who].board[adjacent])
              this.damageMinion(target.who,adjacent,1,'cleave');
          }
        }
      }
    }
    if (!s.active) return true;
    s.busy=false;
    this.emit('attackEnd',{who,slot,target});
    this.checkEnd();
    return true;
  },

  recordAnswer(id,correct) {
    const s=this.state; if (!s?.active) return;
    const item=s.matchStats[id] ||= {correct:0,wrong:0};
    item[correct?'correct':'wrong']++;
    this.emit('answer',{id,correct});
  },

  checkEnd() {
    const s=this.state;
    if (!s?.active) return;
    if (s.player.hp<=0 && s.enemy.hp<=0) this.finish('draw','Оба героя пали');
    else if (s.player.hp<=0) this.finish('enemy','Герой пал');
    else if (s.enemy.hp<=0) this.finish('player','Противник повержен');
  },

  finish(result,reason) {
    const s=this.state; if (!s?.active) return;
    s.active=false; clearInterval(this.timerId); this.timerId=null;
    s.result=result; s.reason=reason; s.duration=Math.min(600000,Date.now()-s.startedAt);
    this.emit('finish',{result,reason});
  }
};
