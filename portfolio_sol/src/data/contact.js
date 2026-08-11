export function buildGmailComposeUrl(email) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
}

export function buildWhatsAppUrl(phone) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

const email = "fanaraasol@gmail.com";
const phone = "+54 9 3512 17-7453";

export const contact = {
  email,
  phone,
  emailHref: buildGmailComposeUrl(email),
  whatsappHref: buildWhatsAppUrl(phone),
};
