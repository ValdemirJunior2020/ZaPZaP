/* NexusSales UI language — one saved business preference, three languages. */
(function(){
"use strict";
const languages=Object.freeze({en:"English",es:"Español",pt:"Português"});
const entries=[
["Overview","Visão geral","Resumen"],
["My Store","Minha empresa","Mi empresa"],
["Products & Services","Produtos e serviços","Productos y servicios"],
["SmartLinks","Links inteligentes","Enlaces inteligentes"],
["Leads & Chats","Leads e conversas","Clientes y chats"],
["Equipe / Employees","Equipe / Funcionários","Equipo / Empleados"],
["Build Your Personal Assistant","Criar meu assistente pessoal","Crear mi asistente personal"],
["AI Error Logs","Erros da IA","Errores de IA"],
["Billing & Trial","Assinatura e teste","Facturación y prueba"],
["Account Settings","Configurações da conta","Configuración de cuenta"],
["Sign out","Sair","Cerrar sesión"],
["Sign in","Entrar","Iniciar sesión"],
["Your business","Sua empresa","Tu empresa"],
["BUSINESS WORKSPACE","PAINEL DA EMPRESA","PANEL DE EMPRESA"],
["BUSINESS OVERVIEW","VISÃO GERAL","RESUMEN DE EMPRESA"],
["Your business command center","Central da sua empresa","Centro de control de tu empresa"],
["Set up and publish your SmartStore.","Configure e publique sua loja inteligente.","Configura y publica tu tienda inteligente."],
["BUSINESS SETTINGS","CONFIGURAÇÕES DA EMPRESA","CONFIGURACIÓN DE EMPRESA"],
["Set up your SmartStore","Configure sua loja inteligente","Configura tu tienda inteligente"],
["Teach the AI what your company does.","Ensine à IA o que sua empresa faz.","Enseña a la IA qué hace tu empresa."],
["PRODUCTS & SERVICES","PRODUTOS E SERVIÇOS","PRODUCTOS Y SERVICIOS"],
["What you sell","O que você vende","Qué vendes"],
["Enter your actual offerings, prices and details.","Informe seus produtos, preços e detalhes reais.","Añade productos, precios y detalles reales."],
["TRACKED QR CODES","CÓDIGOS QR RASTREADOS","CÓDIGOS QR RASTREADOS"],
["Turn foot traffic into leads","Transforme visitas em clientes","Convierte visitas en clientes"],
["LEAD CENTER","CENTRAL DE CLIENTES","CENTRO DE CLIENTES"],
["Leads & conversations","Clientes e conversas","Clientes y conversaciones"],
["Every inquiry, appointment request and captured conversation.","Todas as solicitações, agendamentos e conversas.","Todas las consultas, citas y conversaciones."],
["TEAM MANAGEMENT","GESTÃO DA EQUIPE","GESTIÓN DE EQUIPO"],
["PERSONAL AI BUILDER","ASSISTENTE PESSOAL","ASISTENTE PERSONAL"],
["AI DIAGNOSTICS","DIAGNÓSTICO DA IA","DIAGNÓSTICO DE IA"],
["48-HOUR TRIAL & BILLING","TESTE DE 48 HORAS E COBRANÇA","PRUEBA DE 48 HORAS Y FACTURACIÓN"],
["Your subscription","Sua assinatura","Tu suscripción"],
["Account & Security","Conta e segurança","Cuenta y seguridad"],
["Your own AI. Your real business information.","Sua IA. As informações reais da sua empresa.","Tu IA. Información real de tu empresa."],
["Total leads","Total de clientes","Total de clientes"],
["New inquiries","Novas solicitações","Nuevas solicitudes"],
["Appointment requests","Pedidos de agendamento","Solicitudes de cita"],
["QR-sourced leads","Clientes por QR Code","Clientes por código QR"],
["Leads & Chats views","Visualizações de clientes","Vistas de clientes"],
["All leads","Todos os clientes","Todos los clientes"],
["Lead Center","Central de clientes","Centro de clientes"],
["Every customer request, follow-up and linked AI transcript in one place.","Solicitações, acompanhamentos e conversas com IA em um só lugar.","Consultas, seguimientos y conversaciones con IA en un solo lugar."],
["No leads yet. Publish a QR code and ask a customer to submit an inquiry.","Ainda não há clientes. Publique um QR Code e receba solicitações.","Todavía no hay clientes. Publica un código QR y recibe consultas."],
["New","Novo","Nuevo"],
["Contacted","Contatado","Contactado"],
["Appointment requested","Agendamento solicitado","Cita solicitada"],
["Booked","Agendado","Reservado"],
["Won","Ganho","Ganado"],
["Lost","Perdido","Perdido"],
["Save status","Salvar status","Guardar estado"],
["Customer request","Solicitação do cliente","Solicitud del cliente"],
["AI conversation history","Histórico de conversas da IA","Historial de conversaciones de IA"],
["No conversation was linked to this inquiry.","Nenhuma conversa vinculada a esta solicitação.","No hay ninguna conversación vinculada a esta consulta."],
["Close","Fechar","Cerrar"],
["Contact","Contato","Contacto"],
["REQUEST TYPE","TIPO DE SOLICITAÇÃO","TIPO DE SOLICITUD"],
["PREFERRED TIME","HORÁRIO PREFERIDO","HORARIO PREFERIDO"],
["QUICK LINKS","LINKS RÁPIDOS","ENLACES RÁPIDOS"],
["Your permanent SmartLink","Seu SmartLink permanente","Tu SmartLink permanente"],
["Copy","Copiar","Copiar"],
["Open store","Abrir loja","Abrir tienda"],
["Share by text","Compartilhar por SMS","Compartir por SMS"],
["Share by email","Compartilhar por e-mail","Compartir por correo"],
["Publish store","Publicar loja","Publicar tienda"],
["Unpublish store","Despublicar loja","Despublicar tienda"],
["Tracked QR codes","Códigos QR rastreados","Códigos QR rastreados"],
["Customer conversation settings","Configurações das conversas","Configuración de conversaciones"],
["Allow appointment requests","Permitir pedidos de agendamento","Permitir solicitudes de cita"],
["Visitor messages","Mensagens do visitante","Mensajes del visitante"],
["Minutes per session","Minutos por sessão","Minutos por sesión"],
["Save","Salvar","Guardar"],
["Save offering","Salvar produto ou serviço","Guardar producto o servicio"],
["Product or service","Produto ou serviço","Producto o servicio"],
["Type","Tipo","Tipo"],
["Name","Nome","Nombre"],
["Details","Detalhes","Detalles"],
["Availability","Disponibilidade","Disponibilidad"],
["Image URL (HTTPS)","URL da imagem (HTTPS)","URL de imagen (HTTPS)"],
["Price or pricing model","Preço ou modelo de cobrança","Precio o modelo de cobro"],
["Product","Produto","Producto"],
["Service","Serviço","Servicio"],
["Package","Pacote","Paquete"],
["Consultation","Consulta","Consulta"],
["Custom quote","Orçamento personalizado","Presupuesto personalizado"],
["Available","Disponível","Disponible"],
["Booking required","Agendamento necessário","Cita obligatoria"],
["Request a quote","Solicitar orçamento","Solicitar presupuesto"],
["In stock","Em estoque","En stock"],
["Out of stock","Sem estoque","Agotado"],
["Contact for availability","Consulte disponibilidade","Consultar disponibilidad"],
["Add offering","Adicionar produto ou serviço","Agregar producto o servicio"],
["Website widget","Widget para site","Widget para sitio web"],
["Generate my website widget","Gerar chatbot para meu site","Generar chatbot para mi sitio"],
["Disable widget","Desativar chatbot","Desactivar chatbot"],
["Copy widget code","Copiar código do chatbot","Copiar código del chatbot"],
["Widget script copied","Código do chatbot copiado","Código del chatbot copiado"],
["Your store is published and accepting customer conversations.","Sua loja está publicada e recebe clientes.","Tu tienda está publicada y recibe clientes."],
["Save business information","Salvar dados da empresa","Guardar datos de la empresa"],
["Business information and operating hours","Informações e horários da empresa","Datos y horarios de la empresa"],
["Business name","Nome da empresa","Nombre de empresa"],
["Business type","Tipo de negócio","Tipo de negocio"],
["Business hours","Horário de funcionamento","Horario comercial"],
["Time zone","Fuso horário","Zona horaria"],
["Country","País","País"],
["City","Cidade","Ciudad"],
["Street address","Endereço","Dirección"],
["Closed","Fechado","Cerrado"],
["Opening hours","Horários de funcionamento","Horarios de apertura"],
["Sales intelligence","Inteligência de vendas","Inteligencia de ventas"],
["Sales / Vendas","Vendas","Ventas"],
["Calendar / Agenda","Agenda","Calendario"],
["Monthly","Mensal","Mensual"],
["No payment required","Nenhum pagamento necessário","No se requiere pago"],
["Your account is subscribed.","Sua assinatura está ativa.","Tu suscripción está activa."],
["The trial has ended.","Seu período de teste terminou.","El período de prueba terminó."],
["Core store, AI salesperson, SmartLinks and leads.","Loja, vendedor com IA, links e clientes.","Tienda, vendedor con IA, enlaces y clientes."],
["Manage PayPal subscription","Gerenciar assinatura PayPal","Administrar suscripción PayPal"],
["Business data is temporarily unavailable. Your account has not been logged out. Refresh the page to retry.","Os dados da empresa estão temporariamente indisponíveis. Sua sessão foi mantida. Atualize para tentar novamente.","Los datos de la empresa no están disponibles. Tu sesión sigue activa. Actualiza para reintentar."],
["Welcome back","Bem-vindo de volta","Bienvenido de nuevo"],
["Create your business account","Crie sua conta empresarial","Crea tu cuenta empresarial"],
["Email address","Endereço de e-mail","Correo electrónico"],
["Password","Senha","Contraseña"],
["Create account","Criar conta","Crear cuenta"],
["Forgot password?","Esqueceu a senha?","¿Olvidaste tu contraseña?"],
["Business phone number","Telefone da empresa","Teléfono de la empresa"],
["Log in","Entrar","Ingresar"],
["Subscribe","Assinar","Suscribirse"],
["Please sign in again","Faça login novamente","Vuelve a iniciar sesión"]
];
const byEn=new Map(entries.map(e=>[e[0],e]));
const byLocalized=new Map();
for(const e of entries)for(const term of e.slice(1))if(!byLocalized.has(term))byLocalized.set(term,e);
let locale='en',save=null,scheduled=false,observer=null;
function normalize(value){const v=String(value||'en').toLowerCase();return v==='pt'||v==='pt_br'||v==='pt-br'?'pt':v==='es'||v==='es_es'||v==='es-es'?'es':'en'}
function t(english){const e=byEn.get(String(english));return e?e[locale==='pt'?1:locale==='es'?2:0]:String(english)}
function original(text){return byEn.get(text)||byLocalized.get(text)}
function changeNode(node){
 const current=node.nodeValue;if(!current||!current.trim())return;
 const trimmed=current.trim(),entry=original(trimmed);if(!entry)return;
 const target=entry[locale==='pt'?1:locale==='es'?2:0];
 if(trimmed!==target)node.nodeValue=current.replace(trimmed,target);
}
function apply(){
 if(!document.body)return;
 document.documentElement.lang=locale==='pt'?'pt-BR':locale==='es'?'es-ES':'en-US';
 document.querySelectorAll('[data-nx-language-choice]').forEach(el=>{if(el.value!==locale)el.value=locale});
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
  acceptNode(node){
   if(!node.parentElement||node.parentElement.closest('script,style,textarea,pre,code,[data-nx-no-translate],.lead-transcript,.nx-intel-panel table'))return NodeFilter.FILTER_REJECT;
   return NodeFilter.FILTER_ACCEPT;
  }
 });
 while(walker.nextNode())changeNode(walker.currentNode);
 document.querySelectorAll('input[placeholder],textarea[placeholder],[title],[aria-label]').forEach(el=>{
  for(const attr of ['placeholder','title','aria-label']){
   const current=el.getAttribute(attr);if(!current)continue;
   const e=original(current);if(e)el.setAttribute(attr,e[locale==='pt'?1:locale==='es'?2:0]);
  }
 });
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply()})}
function setLanguage(value,{persist=true}={}){
 const next=normalize(value),previous=locale;locale=next;
 try{localStorage.setItem('nexus_platform_language',locale)}catch{}
 schedule();
 window.dispatchEvent(new CustomEvent('nexus:language',{detail:{language:locale}}));
 if(!persist)return Promise.resolve();
 if(typeof save!=='function')return Promise.reject(new Error('Business language is not connected'));
 return Promise.resolve().then(()=>save(next)).catch(error=>{
  locale=previous;
  try{localStorage.setItem('nexus_platform_language',previous)}catch{}
  schedule();
  window.dispatchEvent(new CustomEvent('nexus:language',{detail:{language:locale}}));
  throw error;
 });
}
function getLanguage(){return locale}
function bindSave(callback){save=callback}
function start(){
 if(!document.body)return;
 if(observer)return;
 observer=new MutationObserver(schedule);
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 apply();
}
try{locale=normalize(localStorage.getItem('nexus_platform_language')||'en')}catch{}
window.NexusLanguage={t,setLanguage,getLanguage,bindSave,apply,start,normalize,languages};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();