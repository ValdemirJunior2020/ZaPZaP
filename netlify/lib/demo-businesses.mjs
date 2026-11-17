// Fixed, fictional, self-contained demo data. No real tenant IDs, products or leads.
const businesses=Object.freeze({
 auto:{
  store:{name:"SunHarbor Auto",agent_name:"Alex",description:"Fictional neighborhood dealership offering transparent vehicle shopping assistance. All prices and vehicles below are illustrative, not real inventory.",hours:"Mon–Sat, 9 AM–6 PM"},
  items:[
   {name:"2024 Harborline Compact SUV",type:"Product",description:"Fictional five-seat SUV with backup camera and Apple CarPlay. Test-drive appointment requires confirmation.",price_label:"$24,900 demo price",status:"Illustrative example only"},
   {name:"2023 Seabreeze Sedan",type:"Product",description:"Fictional fuel-efficient four-door sedan with adaptive cruise control.",price_label:"$18,750 demo price",status:"Illustrative example only"},
   {name:"Trade-in consultation",type:"Service",description:"Example service to discuss evaluating a trade-in. Actual offers are not provided through this demonstration.",price_label:"Free consultation (demo)",status:"Appointment requires confirmation"}
  ]
 },
 beauty:{
  store:{name:"Velora Beauty",agent_name:"Mia",description:"Fictional beauty studio providing hair styling and facials. Offerings are illustrative, not real bookings.",hours:"Tue–Sat, 10 AM–7 PM"},
  items:[
   {name:"Signature haircut & style",type:"Service",description:"Consultation, precision cut and blowout.",price_label:"From $65 (demo)",status:"Booking required"},
   {name:"Hydrating facial",type:"Service",description:"60-minute facial designed for hydration and relaxation.",price_label:"$95 (demo)",status:"Booking required"},
   {name:"Color consultation",type:"Service",description:"Discuss desired color and maintenance; quote after consultation.",price_label:"Consultation free (demo)",status:"Booking required"}
  ]
 },
 hvac:{
  store:{name:"NorthPeak HVAC",agent_name:"Sam",description:"Fictional residential heating and cooling company; all service details and prices are examples.",hours:"Mon–Fri, 8 AM–6 PM"},
  items:[
   {name:"AC tune-up",type:"Service",description:"Example maintenance visit including filter inspection and basic system checks.",price_label:"From $89 (demo)",status:"Appointment required"},
   {name:"Heating system inspection",type:"Service",description:"Inspection of residential heating equipment; repairs quoted separately.",price_label:"From $99 (demo)",status:"Appointment required"},
   {name:"Thermostat installation",type:"Service",description:"Installation service; equipment purchased separately.",price_label:"From $120 labor (demo)",status:"Quote required"}
  ]
 }
});
function businessFor(id){return Object.hasOwn(businesses,id)?businesses[id]:null}
export{businessFor};
