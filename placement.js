const placementState={questions:[],index:0,score:0,mastered:[],answered:false};
let placementStore=JSON.parse(localStorage.getItem('forevar-placement')||'{"mastered":[],"level":"Não realizado"}');
let placementRecognition=null;

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

async function placementRecognize(){
  const q=placementState.questions[placementState.index],w=q.word,out=$('#placementFeedback'),button=$('#placementSpeak'),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!window.isSecureContext){out.textContent='Abra o aplicativo pelo link oficial seguro para usar o microfone.';out.className='speech-result retry';return}
  if(!navigator.mediaDevices?.getUserMedia){out.textContent='Este navegador não liberou o microfone. Abra o forEVAr no Chrome do celular.';out.className='speech-result retry';return}
  if(!SR){out.textContent='Reconhecimento de voz indisponível. No Android, use o Chrome. No iPhone, use o Safari atualizado.';out.className='speech-result retry';return}
  try{
    button.disabled=true;button.classList.add('listening');button.textContent='🎙️ Preparando microfone…';out.textContent='Autorize o microfone quando o celular perguntar.';out.className='speech-result';
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(track=>track.stop());
    placementRecognition=new SR();placementRecognition.lang='zh-CN';placementRecognition.continuous=false;placementRecognition.interimResults=false;placementRecognition.maxAlternatives=5;let received=false;
    placementRecognition.onstart=()=>{button.textContent='🔴 Ouvindo… fale agora';out.textContent='Fale em mandarim. O microfone está ouvindo.'};
    placementRecognition.onresult=e=>{received=true;const heard=[...e.results[0]].map(x=>x.transcript.replace(/[。！？\s]/g,'')),goal=w[0].replace(/[。！？\s]/g,''),ok=heard.some(x=>x.includes(goal)||goal.includes(x));resetPlacementMic();finishPlacementAnswer(ok,w,heard[0])};
    placementRecognition.onerror=e=>{resetPlacementMic();const messages={'not-allowed':'Microfone bloqueado. Libere o acesso nas configurações do navegador.','service-not-allowed':'O navegador bloqueou o reconhecimento de voz.','no-speech':'Não ouvi sua fala. Toque novamente e fale perto do celular.','audio-capture':'O celular não conseguiu acessar o microfone.',network:'O reconhecimento de voz precisa de internet.'};out.textContent=messages[e.error]||'Não consegui ouvir. Toque novamente e tente.';out.className='speech-result retry'};
    placementRecognition.onend=()=>{if(!received&&!placementState.answered){resetPlacementMic();if(!out.classList.contains('retry')){out.textContent='A escuta terminou sem resposta. Toque novamente e fale em mandarim.';out.className='speech-result retry'}}};
    placementRecognition.start();
  }catch(error){resetPlacementMic();out.textContent=error?.name==='NotAllowedError'?'O microfone está bloqueado. Toque no cadeado do navegador e permita o microfone.':'Não consegui abrir o microfone. Feche outros aplicativos que estejam usando áudio e tente novamente.';out.className='speech-result retry'}
}

function resetPlacementMic(){
  const button=$('#placementSpeak');button.disabled=false;button.classList.remove('listening');button.textContent='🎙️ Falar em mandarim';placementRecognition=null;
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
