/* NexusSales UI language — one saved business preference, three languages. */
(function(){
"use strict";
const languages=Object.freeze({en:"English",es:"Español",pt:"Português"});
const entries=[
["Save your business first to reserve a SmartLink.","Salve os dados da empresa para reservar seu SmartLink.","Guarda los datos de tu empresa para reservar tu SmartLink."],
["Put this on your Instagram bio, flyers, emails and text messages. Customers can browse offerings and chat with your AI assistant.","Compartilhe na bio do Instagram, panfletos, e-mails e mensagens. Clientes poderão ver seus serviços e conversar com a IA.","Compártelo en Instagram, folletos, correos y mensajes. Los clientes podrán ver tus servicios y hablar con la IA."],
["This link is reserved but not public yet. Publishing requires an active hosted AI service and at least one offering.","Este link está reservado, mas ainda não está público. Para publicar, a IA deve estar ativa e você deve cadastrar um produto ou serviço.","Este enlace está reservado, pero aún no es público. Para publicarlo, la IA debe estar activa y debes registrar un producto o servicio."],
["Publish store — free forever","Publicar loja — grátis para sempre","Publicar tienda — gratis para siempre"],
["Publish store & start trial","Publicar loja e iniciar teste","Publicar tienda e iniciar prueba"],
["Website widget • +$79/month","Chatbot para site • +US$ 79/mês","Chatbot para sitio web • +79 USD/mes"],
["Embed your AI salesperson on an existing website. The 48-hour trial includes widget access; the new business checkout must be verified before charges can begin.","Adicione seu vendedor com IA ao site. O teste de 48 horas inclui o chatbot; a cobrança empresarial precisa ser verificada antes de ativar pagamentos.","Añade tu vendedor con IA al sitio web. La prueba de 48 horas incluye el chatbot; el cobro empresarial debe verificarse antes de activar pagos."],
["Install script (add before the closing body tag)","Código de instalação (antes de fechar a tag body)","Código de instalación (antes de cerrar la etiqueta body)"],
["The website widget requires an active bundled subscription after the trial.","O chatbot do site exige uma assinatura ativa após o período de teste.","El chatbot del sitio requiere una suscripción activa después de la prueba."],
["People to follow up","Pessoas para acompanhar","Personas para seguimiento"],
["Awaiting response","Aguardando resposta","Esperando respuesta"],
["Require confirmation","Aguardando confirmação","Requieren confirmación"],
["Attributed to printed codes","Atribuídos aos códigos impressos","Atribuidos a códigos impresos"],
["Filter leads","Filtrar clientes","Filtrar clientes"],
["No contact","Sem contato","Sin contacto"],
["Personal AI","IA pessoal","IA personal"],
["Assistant","Assistente","Asistente"],
["Visitor","Visitante","Visitante"],
["AI Assistant","Assistente de IA","Asistente de IA"],
["Follow-up status","Status do acompanhamento","Estado del seguimiento"],
["Lead status updated","Status do cliente atualizado","Estado del cliente actualizado"],
["Loading customer history…","Carregando histórico do cliente…","Cargando historial del cliente…"],
["SmartStore / website","Loja inteligente / site","Tienda inteligente / sitio web"],
["Not supplied","Não informado","No indicado"],
["Save your business profile in My Store first, then return here.","Salve primeiro os dados da empresa em Minha empresa e volte aqui.","Primero guarda los datos de la empresa en Mi empresa y vuelve aquí."],
["BUILD YOUR PERSONAL ASSISTANT","CRIAR ASSISTENTE PESSOAL","CREAR ASISTENTE PERSONAL"],
["Your AI, your name, your personality","Sua IA, seu nome, sua personalidade","Tu IA, tu nombre, tu personalidad"],
["Build an assistant on NexusSales. Send a personal link by WhatsApp or anywhere else. Visitors open a mobile-first page and may choose to leave a contact request.","Crie um assistente no NexusSales e compartilhe o link pelo WhatsApp. Visitantes poderão conversar e solicitar contato.","Crea un asistente en NexusSales y comparte su enlace por WhatsApp. Los visitantes podrán conversar y solicitar contacto."],
["The personal assistant database migration has not been applied. This builder is in review mode and saving is disabled.","A migração do banco de dados do assistente pessoal não foi aplicada. Não é possível salvar ainda.","No se ha aplicado la migración de la base de datos del asistente personal. Aún no se puede guardar."],
["Assistant name","Nome do assistente","Nombre del asistente"],
["Personal link ID","Identificador do link pessoal","Identificador del enlace personal"],
["Choose a personality","Escolha uma personalidade","Elige una personalidad"],
["Welcome message","Mensagem de boas-vindas","Mensaje de bienvenida"],
["Public information the assistant may share","Informações públicas que o assistente pode compartilhar","Información pública que el asistente puede compartir"],
["Messages per session (5–30)","Mensagens por sessão (5–30)","Mensajes por sesión (5–30)"],
["Session minutes (5–30)","Minutos por sessão (5–30)","Minutos por sesión (5–30)"],
["Public owner phone (+country code)","Telefone público do proprietário (+DDI)","Teléfono público del propietario (+código de país)"],
["Share my phone for direct handoff after the chat limit","Compartilhar meu telefone para contato após o limite do chat","Compartir mi teléfono para contacto al alcanzar el límite del chat"],
["Enable assistant for visitors","Ativar assistente para visitantes","Activar asistente para visitantes"],
["Save assistant","Salvar assistente","Guardar asistente"],
["Create assistant","Criar assistente","Crear asistente"],
["Profile preview; live replies require your Ollama connection.","Prévia do perfil; respostas em tempo real exigem conexão com o Ollama.","Vista previa del perfil; las respuestas en tiempo real requieren conexión con Ollama."],
["Share your personal AI","Compartilhe sua IA pessoal","Comparte tu IA personal"],
["Open assistant","Abrir assistente","Abrir asistente"],
["Share by WhatsApp link","Compartilhar pelo WhatsApp","Compartir por WhatsApp"],
["Faithful Encourager","Encorajador cristão","Alentador cristiano"],
["Christian-inspired kindness and encouragement, only when welcomed.","Gentileza e encorajamento inspirados na fé cristã, apenas quando desejados.","Amabilidad y aliento inspirados en la fe cristiana, solo cuando sean bienvenidos."],
["Exclusive bonus","Bônus exclusivo","Bono exclusivo"],
["NexusSales AI Sales Expert","Especialista em vendas NexusSales AI","Especialista en ventas NexusSales AI"],
["Sells NexusSales with ready-to-use product features, accurate pricing and opt-in lead capture.","Apresenta o NexusSales, seus recursos, preços e captação consentida de clientes.","Presenta NexusSales, sus funciones, precios y captación consentida de clientes."],
["Exclusive · preloaded","Exclusivo · pré-configurado","Exclusivo · preconfigurado"],
["The assistant always identifies itself as AI. Opt-in leads appear in your existing Leads & Chats dashboard.","O assistente sempre se identifica como IA. Contatos autorizados aparecem em Leads e conversas.","El asistente siempre se identifica como IA. Los contactos autorizados aparecen en Clientes y chats."],
["Lifetime complimentary account — no payment required.","Conta vitalícia gratuita — sem pagamento.","Cuenta gratuita de por vida — sin pago."],
["Existing subscription active.","Assinatura atual ativa.","Suscripción actual activa."],
["Business subscriptions are being configured; live checkout is not enabled.","Assinaturas empresariais em configuração; pagamentos ainda não ativados.","Suscripciones empresariales en configuración; pagos aún no activados."],
["Business base with 3 employees. Extra employees: $30 each/month in Brazil or $50 elsewhere.","Plano empresarial com 3 funcionários. Extras: US$ 30/mês no Brasil ou US$ 50 nos demais países.","Plan empresarial con 3 empleados. Extras: 30 USD/mes en Brasil o 50 USD en otros países."],
["Optional website chatbot. Prices are estimates until checkout is verified.","Chatbot opcional para site. Preços estimados até a verificação dos pagamentos.","Chatbot opcional para sitio web. Precios estimados hasta verificar los pagos."],
["The old $149/$228 PayPal plans are retired for new purchases.","Os antigos planos PayPal de US$ 149/228 não são oferecidos para novas compras.","Los antiguos planes PayPal de 149/228 USD ya no se ofrecen para nuevas compras."],
["Account status","Status da conta","Estado de la cuenta"],
["Loading","Carregando","Cargando"],
["Previous period","Período anterior","Período anterior"],
["Next period","Próximo período","Próximo período"],
["Month","Mês","Mes"],
["Week","Semana","Semana"],
["Day","Dia","Día"],
["Today","Hoje","Hoy"],
["Appointment calendar","Calendário de agendamentos","Calendario de citas"],
["New appointment","Novo agendamento","Nueva cita"],
["Edit appointment","Editar agendamento","Editar cita"],
["Customer","Cliente","Cliente"],
["Start time","Horário de início","Hora de inicio"],
["Duration","Duração","Duración"],
["Notes","Observações","Notas"],
["Save appointment","Salvar agendamento","Guardar cita"],
["Industry","Setor","Sector"],
["SmartLink name (editable)","Nome do SmartLink (editável)","Nombre del SmartLink (editable)"],
["AI assistant name","Nome do assistente de IA","Nombre del asistente de IA"],
["AI personality","Personalidade da IA","Personalidad de la IA"],
["Choose how your assistant communicates","Escolha como seu assistente se comunica","Elige cómo se comunica tu asistente"],
["Professional Consultant","Consultor profissional","Consultor profesional"],
["Friendly Guide","Guia amigável","Guía amigable"],
["Sales Specialist","Especialista em vendas","Especialista en ventas"],
["Premium Concierge","Concierge premium","Conserje prémium"],
["Fast & Direct","Rápido e direto","Rápido y directo"],
["Confident, accurate and consultative. Great for most businesses.","Confiante, preciso e consultivo. Ideal para a maioria das empresas.","Seguro, preciso y consultivo. Ideal para la mayoría de las empresas."],
["Warm, patient and easy to understand. Great for retail and family services.","Acolhedor, paciente e fácil de entender. Ideal para comércio e serviços familiares.","Cálido, paciente y fácil de entender. Ideal para comercios y servicios familiares."],
["Discovers needs, explains benefits and offers a helpful next step.","Identifica necessidades, explica vantagens e sugere o próximo passo.","Detecta necesidades, explica ventajas y sugiere el siguiente paso."],
["Attentive, polished and discreet. Great for luxury and premium services.","Atencioso, sofisticado e discreto. Ideal para serviços premium.","Atento, elegante y discreto. Ideal para servicios prémium."],
["Short, clear answers with minimal small talk.","Respostas curtas e claras, sem conversa desnecessária.","Respuestas cortas y claras, sin charlas innecesarias."],
["Recommended default","Padrão recomendado","Opción recomendada"],
["Approachable","Acolhedor","Cercano"],
["Lead conversion","Conversão de leads","Conversión de clientes potenciales"],
["White-glove service","Atendimento exclusivo","Atención exclusiva"],
["Quick responses","Respostas rápidas","Respuestas rápidas"],
["All personalities use your saved business facts. They never invent prices, discounts, guarantees or confirmed appointments. Save, then test the tone under Test My AI.","Todas as personalidades usam os dados salvos da empresa. Elas não inventam preços, descontos, garantias nem agendamentos confirmados. Salve e teste o estilo em Testar Minha IA.","Todas las personalidades usan los datos guardados de la empresa. No inventan precios, descuentos, garantías ni citas confirmadas. Guarda y prueba el estilo en Probar mi IA."],
["Store headline","Chamada principal da loja","Título principal de la tienda"],
["Business description and policies","Descrição e políticas da empresa","Descripción y políticas de la empresa"],
["Store cover image URL (HTTPS)","URL da imagem de capa (HTTPS)","URL de la imagen de portada (HTTPS)"],
["Save business details","Salvar dados da empresa","Guardar datos de la empresa"],
["Image URLs are saved in the database; the original image stays with its image host. Changes are reflected on the public store after publication.","As URLs das imagens são salvas no banco de dados. Os arquivos originais ficam no servidor de origem. As alterações aparecem na loja publicada.","Las URL de imágenes se guardan en la base de datos. Los archivos originales permanecen en el servidor de origen. Los cambios aparecen en la tienda publicada."],
["Your store","Sua loja","Tu tienda"],
["Published storefront","Loja publicada","Tienda publicada"],
["Live","No ar","En línea"],
["Not live","Fora do ar","Sin publicar"],
["Complete setup to publish your business.","Conclua a configuração para publicar sua empresa.","Completa la configuración para publicar tu negocio."],
["Your SmartLink is available to customers.","Seu SmartLink está disponível aos clientes.","Tu SmartLink está disponible para los clientes."],
["Offerings","Produtos e serviços","Productos y servicios"],
["Products, services and consultations","Produtos, serviços e consultas","Productos, servicios y consultas"],
["Customer inquiries","Solicitações de clientes","Consultas de clientes"],
["Leads linked to this business","Leads vinculados a esta empresa","Clientes potenciales vinculados a este negocio"],
["Get ready to sell","Prepare-se para vender","Prepárate para vender"],
["Configure business","Configurar empresa","Configurar empresa"],
["Add products or services","Adicionar produtos ou serviços","Añadir productos o servicios"],
["View SmartLink","Ver SmartLink","Ver SmartLink"],
["Test My AI","Testar minha IA","Probar mi IA"],
["TEST MY AI","TESTAR MINHA IA","PROBAR MI IA"],
["Talk to your own AI salesperson","Converse com seu vendedor de IA","Habla con tu vendedor de IA"],
["Preview real answers from your business catalog before publishing.","Veja respostas reais do seu catálogo antes de publicar.","Prueba respuestas reales de tu catálogo antes de publicar."],
["WEBSITE CHATBOT","CHATBOT PARA SITE","CHATBOT PARA SITIO WEB"],
["Add Chatbot to Your Website","Adicionar chatbot ao meu site","Añadir chatbot a mi sitio web"],
["One script to add your AI salesperson to your own website.","Um código para adicionar seu vendedor de IA ao site.","Un código para añadir tu vendedor de IA al sitio web."],
["Create trackable QR codes for storefronts, vehicles, services and products.","Crie QR Codes rastreáveis para lojas, veículos, serviços e produtos.","Crea códigos QR rastreables para tiendas, vehículos, servicios y productos."],
["Customize your named AI, personality, and personal contact link.","Personalize o nome da IA, a personalidade e o link de contato.","Personaliza el nombre de la IA, su personalidad y el enlace de contacto."],
["Recent chat failures, stages, and diagnostic reference IDs.","Falhas recentes do chat, etapas e IDs de diagnóstico.","Fallos recientes del chat, etapas e identificadores de diagnóstico."],
["SUPER ADMIN","SUPERADMINISTRADOR","SUPERADMINISTRADOR"],
["Brazil & Global Plans","Planos do Brasil e globais","Planes de Brasil y globales"],
["Proposed team and personal-assistant packages; billing is not enabled.","Planos propostos para equipes e assistentes pessoais; cobrança não ativada.","Planes propuestos para equipos y asistentes personales; cobro no activado."],
["Business saved","Empresa salva","Empresa guardada"],
["Business details saved and verified.","Dados da empresa salvos e verificados.","Datos de la empresa guardados y verificados."],
["Brazil · Super Admin","Brasil · Superadministrador","Brasil · Superadministrador"],
["ACCOUNT SETTINGS","CONFIGURAÇÕES DA CONTA","CONFIGURACIÓN DE CUENTA"],
["Nexus AI is thinking…","Nexus AI está pensando…","Nexus AI está pensando…"],
["Store cover image URL (HTTPS)","URL da imagem de capa da loja (HTTPS)","URL de imagen de portada de la tienda (HTTPS)"],
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
 const trimmed=current.trim();
 let entry=original(trimmed),prefix="";
 if(!entry){
  // Sidebar buttons carry Unicode icons before their names.
  const decorated=trimmed.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ].*)$/u);
  if(decorated){entry=original(decorated[2]);prefix=decorated[1]}
 }
 if(!entry)return;
 const target=prefix+entry[locale==='pt'?1:locale==='es'?2:0];
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