// Business price quotation only. Do not enable PayPal until the entire recurring total is covered by a verified plan.
export const PLANNED_CATALOG=Object.freeze({
 enterpriseBaseUsd:499,includedEmployees:3,
 extraEmployeeBrazilUsd:30,extraEmployeeGlobalUsd:50,websiteWidgetUsd:79,
 personalUsd:30,playfulUsd:15,playfulPersonalities:5,
 businessPlanId:'P-4XB95733XN368212VNL7EWUA',
 globalEmployeePlanId:'P-6EA29029F2269621NNL7EY5Q',
 brazilEmployeePlanId:'P-7W143137018695104NL7EZ7Y',
 widgetAddonPlanId:'P-51700217WH997372MNL7E3FI',
 billingEnabled:false
});
export function proposedEnterpriseTotal(country,employeeCount,websiteWidget=false){
 const count=Math.max(0,Math.min(1000,Math.floor(Number(employeeCount)||0)));
 const extra=Math.max(0,count-PLANNED_CATALOG.includedEmployees);
 const extraPrice=String(country).toUpperCase()==='BR'?PLANNED_CATALOG.extraEmployeeBrazilUsd:PLANNED_CATALOG.extraEmployeeGlobalUsd;
 const widget=websiteWidget===true?PLANNED_CATALOG.websiteWidgetUsd:0;
 const base=PLANNED_CATALOG.enterpriseBaseUsd;
 return {currency:'USD',base,included:PLANNED_CATALOG.includedEmployees,employees:count,
  extraEmployees:extra,extraPrice,websiteWidget:websiteWidget===true,widgetMonthly:widget,
  monthlyTotal:base+extra*extraPrice+widget,billingEnabled:false};
}
