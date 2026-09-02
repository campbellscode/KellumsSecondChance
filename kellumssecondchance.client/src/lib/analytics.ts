type EventName='estimate_form_started'|'estimate_form_submitted'|'employment_interest_submitted'|'phone_link_clicked'|'email_link_clicked'|'project_viewed'|'before_after_interacted'|'work_with_us_viewed';
const provider=import.meta.env.VITE_ANALYTICS_PROVIDER as string|undefined;
export function trackEvent(name:EventName,properties:Record<string,string|number|boolean>={}){if(!provider)return;window.dispatchEvent(new CustomEvent('kellums:analytics',{detail:{provider,name,properties}}));}
