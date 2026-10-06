export interface NotificationTemplatesMap {
  ACCEPTED: string;
  READY: string;
  SERVED: string;
  COMPLETED: string;
  CANCELLED: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplatesMap = {
  ACCEPTED: `வணக்கம் {customer_name}! 👋\n\nஉங்க Order #{order_number} ({table_number}) {hotel_name}-ல் Confirm செய்யப்பட்டு சமையல் அறையில் தயாராகிக் கொண்டிருக்கிறது 🍲.\n\nLive Order Status:\n{order_url}`,
  READY: `வணக்கம் {customer_name}! 🛎️\n\nஉங்க Order #{order_number} ({table_number}) சூடாக Ready ஆகிவிட்டது! Waiter விரைவில் உங்கள் மேஜைக்கு கொண்டு வருவார் 😋.`,
  SERVED: `வணக்கம் {customer_name}! 🍽️\n\nஉங்க Order #{order_number} ({table_number}) பரிமாறப்பட்டுவிட்டது. உணவை ருசித்து மகிழுங்கள்!\n\nDigital Bill:\n{bill_url}`,
  COMPLETED: `வணக்கம் {customer_name}! 🙏\n\n{hotel_name}-ல் உணவருந்தியதற்கு மிக்க நன்றி. உங்கள் பில் தொகை பெறப்பட்டு முடிந்தது.\n\nView Paid Bill Receipt:\n{bill_url}`,
  CANCELLED: `வணக்கம் {customer_name}! ⚠️\n\nஉங்க Order #{order_number} ({table_number})-ல் சில உணவுகள் முடிந்துவிட்டதால் நீக்கப்பட்டுள்ளன. மீதமுள்ள உணவுகள் பரிமாறப்படும்.\n\nDetails: {order_url}`,
};

/**
 * Renders template string by replacing dynamic placeholder tags (client-safe)
 */
export function renderNotificationTemplate(
  template: string,
  vars: {
    customer_name?: string;
    order_number?: string;
    table_number?: string;
    hotel_name?: string;
    order_url?: string;
    bill_url?: string;
    amount?: string;
    reason?: string;
  }
): string {
  let result = template;
  result = result.replace(/\{customer_name\}/g, vars.customer_name || "Customer");
  result = result.replace(/\{order_number\}/g, vars.order_number || "");
  result = result.replace(/\{table_number\}/g, vars.table_number || "Your Table");
  result = result.replace(/\{hotel_name\}/g, vars.hotel_name || "Hotel");
  result = result.replace(/\{order_url\}/g, vars.order_url || "");
  result = result.replace(/\{bill_url\}/g, vars.bill_url || vars.order_url || "");
  result = result.replace(/\{amount\}/g, vars.amount || "");
  result = result.replace(/\{reason\}/g, vars.reason || "");
  return result;
}
