/**
 * Client_Details input flow — field mapping from Botbiz exports
 * (components/Whatsapp/*.csv + whatsapp-bot JSON)
 *
 * Botbiz may send custom fields by display name, question text, or numeric ID.
 */
export const BOTBIZ_CUSTOM_FIELD_IDS = {
  full_name_en: "56356",
  full_name_hi: "56357",
  full_name_mr: "56360",
  mobile_hi: "56358",
  loan_type: "56429",
  personal_loan_amount: "56432",
  credit_card_amount: "56437",
  recovery_harassment: "56443",
} as const;

export const BOTBIZ_CLIENT_DETAILS_FIELDS = {
  subscriber_id: ["Subscriber ID", "subscriber_id", "subscriber id", "SUBSCRIBER ID"],
  client_name: [
    "Full Name",
    "Full_Name",
    "first_name",
    "First Name",
    "SUBSCRIBER NAME",
    "Subscriber Name",
    "subscriber_name",
    "Could you please tell me your full name?",
    "कृपया अपना पूरा नाम लिखें।",
    "कृपया तुमचे पूर्ण नाव लिहा.",
    "पूरा नाम",
    "पूर्ण नाव",
    "client_name",
    "name",
    "full_name",
  ],
  client_phone: [
    "phone",
    "Phone",
    "mobile",
    "Mobile",
    "PHONE NUMBER",
    "Phone Number",
    "phone_number",
    "Thank you! \nNow, please provide your mobile number.",
    "धन्यवाद! \nअब, कृपया अपना मोबाइल नंबर दें ताकि हमारी टीम आपसे संपर्क कर सके।",
    "मोबाइल नंबर",
    "client_phone",
  ],
  loan_type: [
    "Loan_Type",
    "Loan Type",
    "loan type",
    BOTBIZ_CUSTOM_FIELD_IDS.loan_type,
    "What type of Loan do you have?",
    "आपके पास किस प्रकार का लोन है?",
    "तुमच्याकडे कोणत्या प्रकारचे कर्ज आहे?",
    "loan_type",
  ],
  personal_loan_amount: [
    "Personal_Loan_Amount",
    "Personal Loan Amount",
    "personal loan amount",
    BOTBIZ_CUSTOM_FIELD_IDS.personal_loan_amount,
    "Please tell me your Personal Loan amount",
    "कृपया मुझे अपने पर्सनल लोन की राशि बताएं।",
    "कृपया तुमची वैयक्तिक कर्ज (Personal Loan) रक्कम सांगा.",
  ],
  credit_card_amount: [
    "Credit_Card_Amount",
    "Credit Card Amount",
    "credit card amount",
    BOTBIZ_CUSTOM_FIELD_IDS.credit_card_amount,
    "Please tell me your Outstanding Credit Card Amount",
    "कृपया मुझे अपनी क्रेडिट कार्ड की बकाया राशि (Outstanding Amount) बताएं।",
    "कृपया तुमची क्रेडिट कार्डची थकबाकी (Outstanding Amount) सांगा.",
  ],
  harassment: [
    "Recovery_Harassment",
    "Recovery Harassment",
    "recovery harassment",
    BOTBIZ_CUSTOM_FIELD_IDS.recovery_harassment,
    "Are you facing recovery harassment?",
    "क्या आप रिकवरी एजेंटों द्वारा उत्पीड़न (Harassment) का सामना कर रहे हैं?",
    "तुम्ही रिकव्हरी एजंट्सकडून होणाऱ्या त्रासाला (Harassment) सामोरे जात आहात का?",
  ],
} as const;
