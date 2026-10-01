const CARDS = [
  {id:'wo',hanzi:'我',pinyin:'wǒ',meaning:'я',category:'местоимения',type:'minion',cost:1,atk:1,hp:2},
  {id:'ni',hanzi:'你',pinyin:'nǐ',meaning:'ты',category:'местоимения',type:'minion',cost:1,atk:2,hp:1,charge:true},
  {id:'ta_he',hanzi:'他',pinyin:'tā',meaning:'он',category:'местоимения',type:'minion',cost:2,atk:2,hp:2},
  {id:'ta_she',hanzi:'她',pinyin:'tā',meaning:'она',category:'местоимения',type:'minion',cost:2,atk:2,hp:3},
  {id:'ta_it',hanzi:'它',pinyin:'tā',meaning:'оно',category:'местоимения',type:'minion',cost:1,atk:1,hp:1},
  {id:'nin',hanzi:'您',pinyin:'nín',meaning:'Вы (вежливо)',category:'местоимения',type:'minion',cost:3,atk:2,hp:4,taunt:true,barrier:true},
  {id:'women',hanzi:'我们',pinyin:'wǒmen',meaning:'мы',category:'местоимения',type:'minion',cost:4,atk:3,hp:4},
  {id:'nimen',hanzi:'你们',pinyin:'nǐmen',meaning:'вы',category:'местоимения',type:'minion',cost:4,atk:4,hp:3},
  {id:'tamen',hanzi:'她们',pinyin:'tāmen',meaning:'они (жен.)',category:'местоимения',type:'minion',cost:5,atk:4,hp:5},
  {id:'baba',hanzi:'爸爸',pinyin:'bàba',meaning:'папа',category:'семья',type:'minion',cost:3,atk:2,hp:5,taunt:true},
  {id:'mama',hanzi:'妈妈',pinyin:'māma',meaning:'мама',category:'семья',type:'minion',cost:3,atk:3,hp:4},
  {id:'gege',hanzi:'哥哥',pinyin:'gēge',meaning:'старший брат',category:'семья',type:'minion',cost:4,atk:4,hp:4,cleave:true},
  {id:'jiejie',hanzi:'姐姐',pinyin:'jiějie',meaning:'старшая сестра',category:'семья',type:'minion',cost:4,atk:3,hp:6},
  {id:'mifan',hanzi:'米饭',pinyin:'mǐfàn',meaning:'рис',category:'еда',type:'minion',cost:2,atk:2,hp:3},
  {id:'miantiao',hanzi:'面条',pinyin:'miàntiáo',meaning:'лапша',category:'еда',type:'minion',cost:2,atk:3,hp:2,cleave:true},
  {id:'shui',hanzi:'水',pinyin:'shuǐ',meaning:'вода',category:'еда',type:'minion',cost:1,atk:1,hp:3,barrier:true},
  {id:'cha',hanzi:'茶',pinyin:'chá',meaning:'чай',category:'еда',type:'minion',cost:1,atk:2,hp:1},
  {id:'jintian',hanzi:'今天',pinyin:'jīntiān',meaning:'сегодня',category:'время',type:'minion',cost:3,atk:3,hp:3},
  {id:'mingtian',hanzi:'明天',pinyin:'míngtiān',meaning:'завтра',category:'время',type:'minion',cost:4,atk:4,hp:4,charge:true},
  {id:'zuotian',hanzi:'昨天',pinyin:'zuótiān',meaning:'вчера',category:'время',type:'minion',cost:3,atk:3,hp:3},
  {id:'nian',hanzi:'年',pinyin:'nián',meaning:'год',category:'время',type:'minion',cost:6,atk:5,hp:6},
  {id:'yue',hanzi:'月',pinyin:'yuè',meaning:'месяц',category:'время',type:'minion',cost:5,atk:4,hp:5},
  {id:'ri',hanzi:'日',pinyin:'rì',meaning:'день',category:'время',type:'minion',cost:4,atk:3,hp:5},
  {id:'xingqi',hanzi:'星期',pinyin:'xīngqī',meaning:'неделя',category:'время',type:'minion',cost:5,atk:5,hp:4,taunt:true,barrier:true},
  {id:'nihao',hanzi:'你好',pinyin:'nǐ hǎo',meaning:'здравствуй',category:'фразы',type:'spell',cost:1,effect:'draw',value:1,description:'Возьми 1 карту'},
  {id:'xiexie',hanzi:'谢谢',pinyin:'xièxie',meaning:'спасибо',category:'фразы',type:'spell',cost:2,effect:'heal',value:6,description:'Восстанови 6 HP'},
  {id:'zaijian',hanzi:'再见',pinyin:'zàijiàn',meaning:'до свидания',category:'фразы',type:'spell',cost:3,effect:'bounce',value:0,description:'Верни врага в руку'},
  {id:'duibuqi',hanzi:'对不起',pinyin:'duìbuqǐ',meaning:'извини',category:'фразы',type:'spell',cost:2,effect:'weaken',value:2,description:'Враг: −2 атаки'},
  {id:'meiguanxi',hanzi:'没关系',pinyin:'méiguānxi',meaning:'ничего страшного',category:'фразы',type:'spell',cost:3,effect:'heal',value:8,description:'Восстанови 8 HP'},
  {id:'yao',hanzi:'要',pinyin:'yào',meaning:'хотеть',category:'действия',type:'spell',cost:2,effect:'draw',value:2,description:'Возьми 2 карты'},
  {id:'chi',hanzi:'吃',pinyin:'chī',meaning:'есть',category:'действия',type:'spell',cost:2,effect:'buff',value:2,description:'Своему бойцу +2/+2'},
  {id:'he',hanzi:'喝',pinyin:'hē',meaning:'пить',category:'действия',type:'spell',cost:1,effect:'heal',value:4,description:'Восстанови 4 HP'},
  {id:'dian',hanzi:'点',pinyin:'diǎn',meaning:'час; точка',category:'время',type:'spell',cost:2,effect:'mana',value:1,description:'Получи 1 ману'},
  {id:'fen',hanzi:'分',pinyin:'fēn',meaning:'минута; часть',category:'время',type:'spell',cost:1,effect:'aoe',value:1,description:'1 урон всем врагам'}
];
const DIGITS = [
  ['一','yī','один'],['二','èr','два'],['三','sān','три'],['四','sì','четыре'],['五','wǔ','пять'],
  ['六','liù','шесть'],['七','qī','семь'],['八','bā','восемь'],['九','jiǔ','девять'],['十','shí','десять']
];
DIGITS.forEach(([hanzi,pinyin,meaning],i) => {
  CARDS.push({id:'n'+(i+1),hanzi,pinyin,meaning,category:'числа',type:'spell',cost:i+1,effect:'damage',value:i+1,description:`${i+1} урона цели`});
});
DIGITS.slice(1,9).forEach(([hanzi,pinyin],i) => {
  const n = i+2;
  CARDS.push({id:'t'+n,hanzi:hanzi+'十',pinyin:pinyin+' shí',meaning:`${n*10}`,category:'десятки',type:'minion',cost:n,atk:n,hp:n});
});
CARDS.push({id:'n100',hanzi:'一百',pinyin:'yì bǎi',meaning:'сто',category:'десятки',type:'minion',cost:10,atk:10,hp:10});

const CARD_MAP = Object.fromEntries(CARDS.map(card => [card.id,card]));
function makeDeck() {
  const deck = [];
  const cheap = CARDS.filter(c => c.cost <= 3);
  const mid = CARDS.filter(c => c.cost >= 4 && c.cost <= 6);
  const high = CARDS.filter(c => c.cost >= 7);
  for (let i=0;i<17;i++) deck.push(cheap[Math.floor(Math.random()*cheap.length)].id);
  for (let i=0;i<9;i++) deck.push(mid[Math.floor(Math.random()*mid.length)].id);
  for (let i=0;i<4;i++) deck.push(high[Math.floor(Math.random()*high.length)].id);
  for (let i=deck.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  const starters=CARDS.filter(c=>c.type==='minion' && c.cost===1);
  deck[deck.length-1]=starters[Math.floor(Math.random()*starters.length)].id;
  return deck;
}
