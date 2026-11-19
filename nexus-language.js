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
entries.push(...[["TEST MY AI","TESTAR MINHA IA","PROBAR MI IA"],["Talk to your own AI salesperson","Converse com seu vendedor de IA","Habla con tu vendedor de IA"],["Preview real answers from your business catalog before publishing.","Teste respostas reais com os dados da sua empresa antes de publicar.","Prueba respuestas reales de tu catálogo antes de publicar."],["WEBSITE CHATBOT","CHATBOT DO SITE","CHATBOT DEL SITIO WEB"],["Add Chatbot to Your Website","Adicionar chatbot ao seu site","Agregar chatbot a tu sitio web"],["One script to add your AI salesperson to your own website.","Um único código para adicionar seu vendedor de IA ao site.","Un código para añadir tu vendedor de IA a tu sitio web."],["SUPER ADMIN","SUPER ADMINISTRADOR","SUPERADMINISTRADOR"],["Brazil & Global Plans","Planos do Brasil e globais","Planes de Brasil y globales"],["Proposed team and personal-assistant packages; billing is not enabled.","Pacotes de equipe e assistente pessoal propostos; cobrança não habilitada.","Paquetes propuestos de equipo y asistente personal; pagos deshabilitados."],["Customize your named AI, personality, and personal contact link.","Personalize o nome, a personalidade e o contato do seu assistente.","Personaliza el nombre, la personalidad y el enlace de contacto."],["Recent chat failures, stages, and diagnostic reference IDs.","Falhas recentes de conversas, etapas e identificadores de diagnóstico.","Fallos recientes de conversación, etapas e identificadores de diagnóstico."],["Base US$499/month, website widget +US$79/month.","Plano base US$499/mês, chatbot no site +US$79/mês.","Plan base US$499/mes, chatbot web +US$79/mes."],["Published storefront","Loja publicada","Tienda publicada"],["Live","Ativa","Activa"],["Not live","Não publicada","No publicada"],["Your SmartLink is available to customers.","Seu SmartLink está disponível para os clientes.","Tu SmartLink está disponible para los clientes."],["Complete setup to publish your business.","Conclua a configuração para publicar sua empresa.","Completa la configuración para publicar tu empresa."],["Offerings","Produtos e serviços","Productos y servicios"],["Products, services and consultations","Produtos, serviços e consultas","Productos, servicios y consultas"],["Customer inquiries","Solicitações de clientes","Consultas de clientes"],["Leads linked to this business","Contatos vinculados a esta empresa","Contactos vinculados a esta empresa"],["Your business has lifetime complimentary access. No trial countdown or subscription payment is required.","Sua empresa tem acesso vitalício gratuito. Não há contagem de teste nem cobrança de assinatura.","Tu empresa tiene acceso gratuito de por vida. Sin cuenta atrás ni pago de suscripción."],["Live AI is not yet connected to NexusSales. Your trial will NOT start, and your public store cannot be published until the hosted AI service is configured.","A IA ainda não está conectada. O teste não começará e a loja não poderá ser publicada até configurar o serviço de IA.","La IA aún no está conectada. La prueba no comenzará ni se podrá publicar la tienda hasta configurar el servicio."],["Your AI service is available. Save your store and offerings, then publish to start the 48-hour trial.","O serviço de IA está disponível. Salve a loja e seus produtos e publique para iniciar o teste de 48 horas.","El servicio de IA está disponible. Guarda la tienda y sus productos y publícala para iniciar la prueba de 48 horas."],["Your 48-hour trial has ended. A verified PayPal subscription is required to resume your store and AI assistant.","Seu teste de 48 horas terminou. É necessária uma assinatura PayPal verificada para continuar.","Tu prueba de 48 horas terminó. Se requiere una suscripción de PayPal verificada para continuar."],["Get ready to sell","Prepare-se para vender","Prepárate para vender"],["Tell the assistant what you offer, include real prices and hours, then publish a permanent SmartLink. Customers can ask questions without creating an account.","Informe à IA seus produtos, preços e horários reais e publique seu SmartLink. Clientes podem perguntar sem criar conta.","Indica productos, precios y horarios reales y publica un SmartLink. Los clientes pueden preguntar sin crear una cuenta."],["Configure business","Configurar empresa","Configurar empresa"],["Add products or services","Adicionar produtos ou serviços","Añadir productos o servicios"],["✦ Test My AI","✦ Testar minha IA","✦ Probar mi IA"],["View SmartLink","Ver SmartLink","Ver SmartLink"],["Permanent SmartLink name","Nome permanente do SmartLink","Nombre permanente del SmartLink"],["Industry","Setor","Sector"],["AI assistant name","Nome do assistente de IA","Nombre del asistente de IA"],["AI personality","Personalidade da IA","Personalidad de la IA"],["Choose how your assistant communicates","Escolha como seu assistente se comunica","Elige cómo se comunica tu asistente"],["Professional Consultant","Consultor profissional","Consultor profesional"],["Friendly Guide","Guia amigável","Guía amigable"],["Sales Specialist","Especialista em vendas","Especialista en ventas"],["Premium Concierge","Concierge premium","Conserje premium"],["Fast & Direct","Rápido e direto","Rápido y directo"],["Recommended default","Recomendado","Recomendado"],["Approachable","Acolhedor","Cercano"],["Lead conversion","Conversão de clientes","Conversión de clientes"],["White-glove service","Atendimento premium","Atención premium"],["Quick responses","Respostas rápidas","Respuestas rápidas"],["Store headline","Título da loja","Título de la tienda"],["Business description and policies","Descrição e políticas da empresa","Descripción y políticas de la empresa"],["Store cover image URL (HTTPS)","URL da imagem de capa (HTTPS)","URL de imagen de portada (HTTPS)"],["Save business details","Salvar dados da empresa","Guardar datos de la empresa"],["Add offering","Adicionar produto ou serviço","Añadir producto o servicio"],["Save offering","Salvar produto ou serviço","Guardar producto o servicio"],["Cancel","Cancelar","Cancelar"],["Edit","Editar","Editar"],["Delete","Excluir","Eliminar"],["Published","Publicado","Publicado"],["Publish when ready","Publicar quando estiver pronto","Publicar cuando esté listo"],["Business details","Dados da empresa","Datos de la empresa"],["Edit offerings","Editar produtos e serviços","Editar productos y servicios"],["PRIVATE PREVIEW • ONLY YOU","PRÉVIA PRIVADA • APENAS VOCÊ","VISTA PREVIA PRIVADA • SOLO TÚ"],["This is a private testing space. Your assistant uses the products, prices, description and hours you saved. Test it before publishing.","Este é um ambiente privado de teste. Sua IA usa os produtos, preços, descrição e horários salvos. Teste antes de publicar.","Esta es una prueba privada. Tu IA usa los productos, precios, descripción y horarios guardados. Pruébala antes de publicar."],["✓ Business saved","✓ Empresa salva","✓ Empresa guardada"],["✓ Testing never publishes the store or starts your 48-hour trial.","✓ Testar não publica a loja nem inicia seu período gratuito de 48 horas.","✓ Probar no publica la tienda ni inicia tu prueba de 48 horas."],["20 private test questions per day. Replies use your configured AI provider, never example responses.","20 perguntas privadas por dia. As respostas usam a IA configurada, nunca exemplos fictícios.","20 preguntas privadas al día. Las respuestas usan tu IA configurada, nunca respuestas simuladas."],["Try: “What do you offer?” · “How much does it cost?” · “When are you open?”","Experimente: “O que vocês oferecem?” · “Quanto custa?” · “Qual é o horário?”","Prueba: “¿Qué ofrecen?” · “¿Cuánto cuesta?” · “¿Cuál es su horario?”"],["Ready to test your saved catalog. Your trial remains untouched.","Pronto para testar seu catálogo. Seu período de teste permanece intacto.","Listo para probar tu catálogo. Tu período de prueba no cambia."],["Send ↗","Enviar ↗","Enviar ↗"],["Ask your own AI a question","Faça uma pergunta à sua IA","Haz una pregunta a tu IA"],["PRIVATE TEST CHAT","CONVERSA PRIVADA DE TESTE","CHAT PRIVADO DE PRUEBA"],["Asking your real AI…","Consultando sua IA real…","Consultando tu IA real…"],["Connecting securely to your AI…","Conectando com segurança à sua IA…","Conectando de forma segura con tu IA…"],["AI answered your question. Your complimentary access stays active.","A IA respondeu. Seu acesso gratuito continua ativo.","La IA respondió. Tu acceso gratuito sigue activo."],["SmartStore","Loja inteligente","Tienda inteligente"],["Copy link","Copiar link","Copiar enlace"],["Open SmartStore","Abrir loja inteligente","Abrir tienda inteligente"],["QR codes","Códigos QR","Códigos QR"],["Generate QR","Gerar QR","Generar QR"],["Download QR","Baixar QR","Descargar QR"],["Share","Compartilhar","Compartir"],["Settings","Configurações","Configuración"],["Status","Situação","Estado"],["Customer","Cliente","Cliente"],["Appointment","Agendamento","Cita"],["Appointments","Agendamentos","Citas"],["Search","Pesquisar","Buscar"],["Search leads","Pesquisar clientes","Buscar clientes"],["Save changes","Salvar alterações","Guardar cambios"],["No leads yet","Ainda não há clientes","Todavía no hay clientes"],["New lead","Novo cliente","Nuevo cliente"],["Email","E-mail","Correo electrónico"],["Phone","Telefone","Teléfono"],["Message","Mensagem","Mensaje"],["Notes","Anotações","Notas"],["History","Histórico","Historial"],["Conversation","Conversa","Conversación"],["Overview","Visão geral","Resumen"],["My Store","Minha empresa","Mi empresa"],["Products & Services","Produtos e serviços","Productos y servicios"],["SmartLinks","Links inteligentes","Enlaces inteligentes"],["Leads & Chats","Leads e conversas","Clientes y chats"],["Test My AI","Testar minha IA","Probar mi IA"],["AI Error Logs","Erros da IA","Errores de IA"],["Billing & Trial","Assinatura e teste","Facturación y prueba"],["Published business","Empresa publicada","Empresa publicada"],["AI assistant","Assistente de IA","Asistente de IA"],["Personal Assistant","Assistente pessoal","Asistente personal"],["Save assistant","Salvar assistente","Guardar asistente"],["Welcome message","Mensagem de boas-vindas","Mensaje de bienvenida"],["Public information the assistant may share","Informações públicas que a IA pode compartilhar","Información pública que la IA puede compartir"],["Public owner phone (+country code)","Telefone público do proprietário (+código do país)","Teléfono público del propietario (+código de país)"],["Share my phone for direct handoff after the chat limit","Compartilhar meu telefone para contato após o limite do chat","Compartir mi teléfono para contacto tras el límite del chat"],["Enable assistant","Ativar assistente","Activar asistente"],["Save personal assistant","Salvar assistente pessoal","Guardar asistente personal"],["Your personal assistant","Seu assistente pessoal","Tu asistente personal"],["Create your personal assistant","Crie seu assistente pessoal","Crea tu asistente personal"],["Your subscription","Sua assinatura","Tu suscripción"],["Payment","Pagamento","Pago"],["Manage subscription","Gerenciar assinatura","Administrar suscripción"],["Monthly price","Preço mensal","Precio mensual"],["Start trial","Iniciar teste","Iniciar prueba"],["Upgrade","Mudar de plano","Cambiar de plan"],["Free trial","Teste grátis","Prueba gratuita"],["Billing","Cobrança","Facturación"],["Subscription","Assinatura","Suscripción"],["Lifetime complimentary access","Acesso gratuito vitalício","Acceso gratuito de por vida"],["Manage subscription","Gerenciar assinatura","Administrar suscripción"],["No results","Nenhum resultado","Sin resultados"],["Loading…","Carregando…","Cargando…"],["Saving…","Salvando…","Guardando…"],["Saved","Salvo","Guardado"],["Your changes have been saved.","Suas alterações foram salvas.","Tus cambios se han guardado."],["Error","Erro","Error"],["Try again","Tentar novamente","Intentar de nuevo"],["Customer name","Nome do cliente","Nombre del cliente"],["Customer phone","Telefone do cliente","Teléfono del cliente"],["Request appointment","Solicitar agendamento","Solicitar cita"],["Business contact information","Informações de contato da empresa","Información de contacto de la empresa"],["No conversations yet","Nenhuma conversa ainda","Aún no hay conversaciones"],["Choose language","Escolher idioma","Elegir idioma"],["Professional Consultant — Confident, accurate and consultative. Great for most businesses.","Consultor profissional — Confiante, preciso e consultivo. Ideal para a maioria das empresas.","Consultor profesional — Seguro, preciso y consultivo. Ideal para la mayoría de las empresas."]]);
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
   if(!node.parentElement||node.parentElement.closest('script,style,textarea,pre,code,[data-nx-no-translate],.lead-transcript,.nx-intel-panel table,.testbot-messages .testbot-bubble,.chat-messages,.bubble.visitor,.bubble.bot'))return NodeFilter.FILTER_REJECT;
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
// Browser preference applies immediately and survives refreshes, even during an API outage.
// Server sync is best effort; a failed request must NEVER snap the UI back to English.
const storageKey="nexus_platform_language";
function browserLanguage(){
 try{const saved=localStorage.getItem(storageKey);return saved&&["en","es","pt"].includes(saved)?saved:null}catch{return null}
}
function setLanguage(value,{persist=true}={}){
 const next=normalize(value);
 locale=next;
 try{localStorage.setItem(storageKey,next)}catch{}
 schedule();
 window.dispatchEvent(new CustomEvent('nexus:language',{detail:{language:locale}}));
 if(!persist||typeof save!=='function')return Promise.resolve({local:true,synced:false});
 return Promise.resolve().then(()=>save(next)).then(()=>({local:true,synced:true}))
  .catch(error=>({local:true,synced:false,error:String(error?.message||"Account sync unavailable")}));
}
function restoreLanguage(serverLanguage){
 // An explicit browser selection takes priority on this device.
 // Server profile is the fallback on first login on another device.
 const preferred=browserLanguage()||normalize(serverLanguage||"en");
 return setLanguage(preferred,{persist:false});
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
locale=browserLanguage()||'en';
window.NexusLanguage={t,setLanguage,restoreLanguage,browserLanguage,getLanguage,bindSave,apply,start,normalize,languages};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();