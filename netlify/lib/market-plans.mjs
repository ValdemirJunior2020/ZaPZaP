// Super-admin product planning only. These values do not authorize billing.
export const PLANNED_CATALOG=Object.freeze({
 enterpriseBaseUsd:500, includedEmployees:3,
 brazilExtraEmployeeUsd:30, globalExtraEmployeeUsd:50,
 personalUsd:30, playfulUsd:15, playfulPersonalities:5,
 billingEnabled:false
});
export function proposedEnterpriseTotal(country,employeeCount){
 const count=Math.max(0,Math.min(1000,Math.floor(Number(employeeCount)||0)));
 const extra=Math.max(0,count-PLANNED_CATALOG.includedEmployees);
 const extraPrice=String(country||"").toUpperCase()==="BR"?PLANNED_CATALOG.brazilExtraEmployeeUsd:PLANNED_CATALOG.globalExtraEmployeeUsd;
 return {currency:"USD",base:500,included:3,employees:count,extraEmployees:extra,extraPrice,monthlyTotal:500+extra*extraPrice,billingEnabled:false};
}
