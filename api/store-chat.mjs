import {adapt} from "../vercel/lib/adapter.mjs";
import {handler} from "../netlify/functions/store-chat.mjs";
export default function vercelHandler(request){return adapt(request,handler)}
