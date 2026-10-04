const Sound = {
  ctx:null,
  enabled:true,
  init() { try { this.enabled=localStorage.getItem('tavern_sound')!=='off'; } catch(e) {} },
  toggle() {
    this.enabled=!this.enabled;
    try { localStorage.setItem('tavern_sound',this.enabled?'on':'off'); } catch(e) {}
    return this.enabled;
  },
  beep(freq,duration,type='sine',volume=0.08,delay=0) {
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      if (this.ctx.state==='suspended') this.ctx.resume();
      const c=this.ctx,t=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,t);
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(volume,t+0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+duration);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t); osc.stop(t+duration+0.02);
    } catch(e) {}
  },
  play(event) {
    if (!this.enabled) return;
    switch(event) {
      case 'correct': this.beep(520,0.14,'sine',0.07); this.beep(780,0.25,'sine',0.07,0.12); break;
      case 'wrong': this.beep(290,0.2,'sawtooth',0.035); this.beep(210,0.3,'sawtooth',0.03,0.15); break;
      case 'play': this.beep(380,0.12,'triangle',0.06); this.beep(570,0.18,'triangle',0.05,0.08); break;
      case 'attack': this.beep(160,0.18,'sawtooth',0.045); break;
      case 'hit': this.beep(110,0.12,'square',0.04); break;
      case 'death': this.beep(240,0.16,'triangle',0.05); this.beep(130,0.26,'triangle',0.04,0.12); break;
      case 'heal': this.beep(590,0.18,'sine',0.06); this.beep(740,0.22,'sine',0.05,0.12); break;
      case 'turn': this.beep(440,0.14,'triangle',0.045); this.beep(660,0.16,'triangle',0.04,0.13); break;
      case 'summon': this.beep(260,0.12,'square',0.025); this.beep(520,0.2,'triangle',0.045,0.1); break;
      case 'barrier': this.beep(840,0.08,'square',0.025); this.beep(490,0.22,'triangle',0.05,0.07); break;
      case 'cleave': this.beep(180,0.09,'sawtooth',0.035); this.beep(130,0.14,'square',0.02,0.06); break;
    }
  }
};
