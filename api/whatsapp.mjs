import {adapt} from "../vercel/lib/adapter.mjs";
import {handler} from "../netlify/functions/whatsapp.mjs";
export default function vercelHandler(request,response){return adapt(request,handler,response)}
