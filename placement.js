const placementState={questions:[],index:0,score:0,mastered:[],answered:false};
let placementStore=JSON.parse(localStorage.getItem('forevar-placement')||'{"mastered":[],"level":"Não realizado"}');

function buildPlacementQuestions(){
  const selected=[];
  Object.entries(activeVocab).forEach(([category,words])=>{
    const pool=[...words].sort(()=>Math.random()-.5).slice(0,3);
    pool.forEach(word=>selected.push({category,word}));
  });
  return selected.sort(()=>Math.random()-.5);
}

function startPlacement(){
  placementState.questions=buildPlacementQuestions();placementState.index=0;placementState.score=0;placementState.mastered=[];placementState.answered=false;
  $('#placementIntro').classList.add('hidden');$('#placementResult').classList.add('hidden');$('#placementQuiz').classList.remove('hidden');renderPlacementQuestion();
}

function renderPlacementQuestion(){
  const q=placementState.questions[placementState.index],w=q.word,n=placementState.index+1,total=placementState.questions.length;
  $('#placementNumber').textContent=`${n} de ${total}`;$('#placementBar').style.width=`${(placementState.index/total)*100}%`;$('#placementCategory').textContent=q.category;$('#placementPortuguese').textContent=w[2];
  $('#placementFeedback').className='speech-result';$('#placementFeedback').textContent='Toque no microfone e responda em mandarim.';$('#placementSpeak').disabled=false;$('#placementDontKnow').disabled=false;$('#placementNext').classList.add('hidden');placementState.answered=false;
}

function placementRecognize(){
  const q=placementState.questions[placementState.index],w=q.word,out=$('#placementFeedback'),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){out.textContent='O teste oral precisa ser aberto no Chrome ou Edge com acesso ao microfone.';out.className='speech-result retry';return}
  const r=new SR();r.lang='zh-CN';r.maxAlternatives=5;r.onstart=()=>{out.textContent='Estou ouvindo… fale agora.'};
  r.onresult=e=>{const heard=[...e.results[0]].map(x=>x.transcript.replace(/[。！？\s]/g,'')),goal=w[0].replace(/[。！？\s]/g,''),ok=heard.some(x=>x.includes(goal)||goal.includes(x));finishPlacementAnswer(ok,w,heard[0])};
  r.onerror=()=>{out.textContent='Não consegui ouvir. Confira a permissão do microfone e tente novamente.';out.className='speech-result retry'};r.start();
}

function finishPlacementAnswer(ok,w,heard=''){
  if(placementState.answered)return;placementState.answered=true;$('#placementSpeak').disabled=true;$('#placementDontKnow').disabled=true;
  const out=$('#placementFeedback');
  if(ok){placementState.score++;placementState.mastered.push(w[0]);out.textContent=`Certo! ${w[0]} · ${w[1]} · ${w[3]}`;out.className='speech-result good'}
  else{out.textContent=`Vamos estudar esta. Resposta: ${w[0]} · ${w[1]}. Tons: ${w[3]}${heard?` O aparelho entendeu “${heard}”.`:''}`;out.className='speech-result retry'}
  $('#placementNext').textContent=placementState.index===placementState.questions.length-1?'Ver resultado':'Próxima palavra →';$('#placementNext').classList.remove('hidden');
}

function nextPlacement(){
  if(placementState.index<placementState.questions.length-1){placementState.index++;renderPlacementQuestion();return}
  finishPlacement();
}

function finishPlacement(){
  const score=placementState.score;let level='Iniciante';if(score>=10)level='Básico avançado';else if(score>=7)level='Básico forte';else if(score>=4)level='Básico inicial';
  const mastered=[...new Set([...(placementStore.mastered||[]),...placementState.mastered])];placementStore={mastered,level,lastTest:new Date().toISOString(),score};localStorage.setItem('forevar-placement',JSON.stringify(placementStore));renderWords();
  $('#placementQuiz').classList.add('hidden');$('#placementResult').classList.remove('hidden');$('#placementLevel').textContent=level;$('#placementScore').textContent=`${score} de ${placementState.questions.length}`;$('#placementSummary').textContent=score>=10?'Ótimo! O app vai priorizar conteúdos mais avançados.':score>=4?'O app vai pular o que já foi reconhecido e reforçar o restante.':'Vamos construir a base oral sem repetir o que ela já acertou.';
}

$('#startPlacement').onclick=startPlacement;$('#restartPlacement').onclick=startPlacement;$('#placementSpeak').onclick=placementRecognize;$('#placementDontKnow').onclick=()=>finishPlacementAnswer(false,placementState.questions[placementState.index].word);$('#placementNext').onclick=nextPlacement;
