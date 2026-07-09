
WhatsApp API
Connect Account
Send Text Message
Send Interactive Buttons
Send Media
Upload Media
Get Conversation
Get PostBack List
Get Message Delivery Status
Get Bot Template
Trigger Bot Flow
Subscriber API
Get Subscriber
Subscribers List
Create Subscriber
Update Subscriber
Delete Subscriber
Reset User Input Flow
Assign Subscriber Chat to Team Member
Assign Subscriber Custom Fields
Custom Fields List
Assign Labels
Remove Labels
Assign Sequence
Remove Sequence
Add Notes To Subscriber
Label API
Label List
Label Create
Catalog API
Catalog List
Sync Catalog
Catalog Order List
Catalog Order Status Change
Onetime Login API
Get Direct Login URL
WhatsApp API
WhatsApp send api, add contact...

WhatsApp API : Account Connect
Connect WhatsApp Business Account

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/account/connect
apiToken
Your api key
String|Required
user_id
User ID of WhatsApp account owner
Integer|Required
whatsapp_business_account_id
WhatsApp Business Account ID
String|Required
access_token
Access Token
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/account/connect?apiToken=API-KEY&user_id=USER-ID&whatsapp_business_account_id=WHATSAPP-BUSINESS-ACCOUNT-ID&access_token=ACCESS-TOKEN
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/account/connect' \
-d 'apiToken=API-KEY' \
-d 'user_id=USER-ID' \
-d 'whatsapp_business_account_id=WHATSAPP-BUSINESS-ACCOUNT-ID' \
-d 'access_token=ACCESS-TOKEN'
Sample Response
{"status":"1","message":"Whatsapp account has been connect successfully."}
WhatsApp API : Send Text Message
Send WhatsApp message to any mobile number

Text vs Template Message
When a user writes you on your chat service using your business number, you can reply to them through text message within 24 hours. This is known as a customer-initiated text message or session message. A WhatsApp template message, on the other hand, uses a pre-approved template for communication and is an outbound message launched by a business. You can get in touch with a user using template messages if you accidentally don`t respond to their message within 24 hours.


API End-point : Send Message (GET/POST)
https://dash.botbiz.io/api/v1/whatsapp/send
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
message
Text message content (need url encoded value for GET request)
String|Required
phone_number
Must start with country code and only numeric characters are allowed
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/send?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&message=TEXT-MESSAGE&phone_number=PHONE-NUMBER
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/send' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'message=TEXT-MESSAGE' \
-d 'phone_number=PHONE-NUMBER'
Sample Response
{"status":"1", "wa_message_id":"wamid.HBgNODgwMTcyMzMwOTAwMxUCABEYEjlGQkY3MEFEMEVGODhCNDkxNQA=", "message":"Message sent successfully."}

{"status":"0","message":"Subscriber limit has been exceeded. You cannot have more subscribers."}
Generate API End-point : Send Template Message (GET/POST)
WhatsApp Account

Debt Free Lawyer (+919272394857)
Select Message Template *
WhatsApp API : Send Interactive Buttons
Send a session message with WhatsApp reply buttons. Optionally attach an image, video, or document as the header.

Reply buttons are session messages and can be sent within the 24 hour customer service window. Send 1 to 3 buttons; each title can be up to 20 characters. To attach media, add media_url (or media_id) along with the buttons; allowed media headers are image, video, and document only.
API End-point : Send Interactive Buttons (POST)
https://dash.botbiz.io/api/v1/whatsapp/send/interactive-buttons
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
phone_number
Must start with country code and only numeric characters are allowed
String|Required
message
Message body shown above the buttons.
String|Required
buttons
JSON array of 1 to 3 reply buttons. Each item can be a string or an object with id and title. Button id can be used later from webhook/button reply payload.
JSON Array|Required
button_header_text
Optional text header for the interactive message. Ignored when a media header is sent.
String|Optional
button_footer_text
Optional footer text for the interactive message.
String|Optional
media_url
Public HTTPS URL of an image, video, or document to use as the interactive header. Use either media_url or media_id.
String|Optional
media_id
WhatsApp media id obtained from the Upload Media API. When using media_id, media_type is required.
String|Optional
media_type
Header media type. One of: image, video, document. Required when using media_id, or when media_url has no file extension. Audio is not supported as a header.
String|Conditional
media_name
Filename to display, only used when media_type is document.
String|Optional
POST Request Example (buttons only)
curl -X POST "https://dash.botbiz.io/api/v1/whatsapp/send/interactive-buttons" \
  -H "Accept: application/json" \
  -d "apiToken=API-KEY" \
  -d "phone_number_id=PHONE-NUMBER-ID" \
  -d "phone_number=PHONE-NUMBER" \
  -d "message=Would you like to continue?" \
  -d 'buttons=[{"id":"buy_now","title":"Buy Now"},{"id":"details","title":"View Details"}]' \
  -d "button_header_text=Product update" \
  -d "button_footer_text=Tap an option"
POST Request Example (media + buttons)
curl -X POST "https://dash.botbiz.io/api/v1/whatsapp/send/interactive-buttons" \
  -H "Accept: application/json" \
  -d "apiToken=API-KEY" \
  -d "phone_number_id=PHONE-NUMBER-ID" \
  -d "phone_number=PHONE-NUMBER" \
  -d "message=Check this product and choose an action." \
  -d "media_url=https://example.com/product.jpg" \
  -d "media_type=image" \
  -d 'buttons=[{"id":"buy_now","title":"Buy Now"},{"id":"details","title":"View Details"}]' \
  -d "button_footer_text=Tap an option"
Sample Response
{"status":"1", "wa_message_id":"wamid.HBgNODgwMTcyMzMwOTAwMxUCABEYEjlGQkY3MEFEMEVGODhCNDkxNQA=", "message":"Message sent successfully."}

{"status":"0","message":"You can send between 1 and 3 reply buttons."}

{"status":"0","message":"When sending media with buttons, media_type must be one of: image, video, document."}
WhatsApp API : Send File / Media
Send image, video, audio, or document using only this endpoint.

You must send media_url or media_id — at least one is required. All other fields below are optional unless noted.
API End-point : Send File (GET/POST)
https://dash.botbiz.io/api/v1/whatsapp/send/file
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
phone_number
Must start with country code and only numeric characters are allowed
String|Required
media_url
Public HTTPS URL of the file. WhatsApp downloads from this link. Use this when you are not using media_id.
String|Required if no media_id
media_id
WhatsApp media id from the Upload Media API or from Graph after uploading. When using media_id only, media_type is required.
String|Required if no media_url
media_type
One of: image, video, audio, document. Required when using media_id only, or when media_url has no file extension.
String|Conditional
media_caption_text
Caption for image, video, or document (not for audio). If omitted, message is used as caption when present.
String|Optional
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/send/file?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER&media_type=image&media_url=https://example.com/image.jpg&message=Caption+text
GET example with media_id (media_type required)
https://dash.botbiz.io/api/v1/whatsapp/send/file?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER&media_type=image&media_id=MEDIA_ID_FROM_GRAPH
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/send/file' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'media_url=https://example.com/file.jpg' \
-d 'media_id=' \
-d 'media_type=image' \
-d 'media_caption_text='
Sample Response
{"status":"1", "wa_message_id":"wamid.HBgNODgwMTcyMzMwOTAwMxUCABEYEjlGQkY3MEFEMEVGODhCNDkxNQA=", "message":"Message sent successfully."}

{"status":"0","message":"Subscriber limit has been exceeded. You cannot have more subscribers."}
WhatsApp API : Upload Media
Upload a file to get media_id and media_type for the Send File API.

API End-point : POST (multipart/form-data)
https://dash.botbiz.io/api/v1/whatsapp/upload/media
apiToken
Your api key (can also be sent as Authorization: Bearer token).
String|Required
phone_number_id
WhatsApp account phone number ID (same as other WhatsApp APIs).
String|Required
media_file
Multipart file field name must be media_file. Supported types follow live chat / WhatsApp limits (image, video, audio, document).
File|Required
POST Request Example
curl -X POST "https://dash.botbiz.io/api/v1/whatsapp/upload/media" \
  -H "Authorization: Bearer API-KEY" \
  -H "Accept: application/json" \
  -F "phone_number_id=PHONE-NUMBER-ID" \
  -F "media_file=@/path/to/local/file.jpg"
Sample Response
{"status":"1","media_id":"1739230482390482","media_type":"image","message":"Upload successful. Use media_id and media_type with the Send File API."}

{"status":"0","message":"..."}
Try upload (this page)
Choose which WhatsApp bot/account to upload against (media_id is tied to that phone number id). Your API key at the top of this page is used for authentication.

WhatsApp account (for media_id)File

Debt Free Lawyer (+919272394857)
No file chosen
WhatsApp API : Get Conversation
Get Conversation of particular subscriber

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/get/conversation
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
limit
Fetch number of conversation message.
Number|Required
offset
Offset of pagination.
Number|Optional
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/get/conversation?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER&limit=10&offset=1
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/get/conversation' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'limit=10' \
-d 'offset=1'
Sample Response
{"status":"1","message":[{"id":8XX3,"whatsapp_bot_subscriber_subscriber_id":"0123456789-23","whatsapp_bot_id":23,"sender":"bot","agent_name":null,"message_content":"{\"delay_in_reply\":0,\"messaging_product\":\"whatsapp\",\"recipient_type\":\"individual\",\"to\":\"0123456789\",\"type\":\"interactive\",\"interactive\":{\"header\":{\"type\":\"text\",\"text\":\"Order gateway\"},\"body\":{\"text\":\"How would you like to purchase it?\"},\"type\":\"button\",\"action\":{\"buttons\":[{\"type\":\"reply\",\"reply\":{\"id\":\"5lvomLOuENXIe6D::gPeAiDDmVQR_jTR\",\"title\":\"Paypal pay\"}},{\"type\":\"reply\",\"reply\":{\"id\":\"YES_START_CHAT_WITH_HUMAN::CBaLoC4yTMyIljZ\",\"title\":\"COD\"}}]}}}","conversation_time":"2024-07-28 13:21:03","wa_message_id":"wamid.HBgNODgwMTcyMzMwOTAwMxUCABEYEjlGQkY3MEFEMEVGODhCNDkxNQA=","reaction_data":null,"message_status":null,"delivery_status_updated_at":"2024-07-28 13:21:03","failed_reason":""}]}
WhatsApp API : Get Post Back List
Get Post Back List

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/get/post-back-list
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/get/post-back-list?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/get/post-back-list' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID'
Sample Response
{"status":"1","message":[{"id":671,"user_id":1,"postback_id":"QUICK_REPLY_LOCATION_REPLY_BOT","whatsapp_bot_id":95,"use_status":"0","status":"1","whatsapp_bot_setting_id":1770,"bot_name":"Location quick reply","is_template":"1","template_jsoncode":"[{\"messaging_product\":\"whatsapp\",\"to\":\"replace_id\",\"type\":\"text\",\"text\":{\"body\":\"Thank you for sharing your location. It has been received. Thank you for being here with us today.\",\"preview_url\":true}}]","template_name":"Location quick reply","template_for":"location-quick-reply","template_id":null,"inherit_from_template":"0","whatsapp_bot_label_ids":"","whatsapp_bot_remove_label_ids":"","remove_sequence_campaign_id":0,"team_assign_role_id":0,"team_assign_user_id":0,"broadcast_sequence_campaign_id":0,"visual_flow_type":"flow","postback_type":"main","whatsapp_bot_visual_flow_builder_campaign_id":1358,"google_sheet_ids":"","updated_at":"2024-07-14 05:25:55","row_type":"static","custom_field_id":0,"custom_field_index":"","custom_field_index_title":"","generateGoogleMeetLink":null,"googleCalendarId":null,"googleMeetToCustomFieldId":null}]}
WhatsApp API : Get Delivery Message Status
Get message statuses from API

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/get/message-status
apiToken
Your api key
String|Required
wa_message_id
WhatsApp message ID to check status
String|Required
whatsapp_bot_id
WhatsApp bot ID
Number|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/get/message-status?apiToken=API-KEY&wa_message_id=WAMID.XXXXX&whatsapp_bot_id=123
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/get/message-status' \
-d 'apiToken=API-KEY' \
-d 'wa_message_id=WAMID.XXXXX' \
-d 'whatsapp_bot_id=123'
Sample Response
{"status":"1","message":{"message_status":"delivered","delivery_status_updated_at":"2024-07-28 13:21:03","read_time":null,"failed_time":null,"failed_reason":""}}
WhatsApp API : Bot Template Get
Get Whatsapp Bot template

API End-point : Get Template (GET/POST)
https://dash.botbiz.io/api/v1/whatsapp/template/list
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/template/list?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/template/list' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID'
Sample Response
{"status":"1","message":{"id":48,"template_id":"437509121867805","whatsapp_business_id":11,"template_name":"ada","template_type":"single","locale":"en_US","header_type":"media","header_subtype":"image","header_content":"","body_content":"To send an interactive message template, make a POST call to \/PHONE_NUMBER_ID\/","footer_content":"","button_content":"[]","template_json":"{\"name\":\"template_23_1666095188\",\"language\":\"en_US\",\"category\":\"transactional\",\"components\":[{\"type\":\"header\",\"format\":\"image\",\"example\":{\"header_handle\":[\"https:\\\/\\\/example.com\\\/assets\\\/images\\\/template\\\/image.jpg\"]}},{\"type\":\"body\",\"text\":\"To send an interactive message template, make a POST call to \\\/PHONE_NUMBER_ID\\\/\"}],\"access_token\":\"EAAHFAlhZBSyEBAIRZCsHKZA5ZAdOWMRL7AwuuCBKd3tZChAQQ1PHojPUS5k76aMVyzzxG9bYp2JQ57aLMfQBCZCpvXKac4KLDZAhejOuw1zkNCxGjvK7J5YwNmZBwTTd8Iig2YDq0vGZBoS20ipsLB4scbOOh0WmQrj7oLI9ZC5rFlsFC9mYctgQKIyJCvZBfgn5pGE1YPiBllrqwZDZD\"}","button_type":"none","variable_map":"{\"header\":[],\"body\":[]}","updated_at":"2022-10-18 12:13:09","user_id":1,"status":"Rejected","system_template":"0","map_needed":"0","check_wp_type":"general"}}
WhatsApp API : Trigger Bot Flow
Trigger your bot to any mobile number

API End-point : Trigger Bot Flow (GET/POST)
https://dash.botbiz.io/api/v1/whatsapp/trigger-bot
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
bot_flow_unique_id
Bot Flow Unique ID
String|Required
phone_number
Must start with country code and only numeric characters are allowed
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/trigger-bot?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&bot_flow_unique_id=BOT-FLOW-UNIQUE-ID&phone_number=PHONE-NUMBER
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/trigger-bot' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'bot_flow_unique_id=BOT-FLOW-UNIQUE-ID' \
-d 'phone_number=PHONE-NUMBER'
Sample Response
{"status":"1","message":"Bot has been trigger successfully."}
WhatsApp API : Subscriber Get
Get Subscriber Using Chat ID (Phone Number

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/get
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
phone_number
Subscriber phone number
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/get?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/get' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER'
Sample Response
{"status":"1","message":[{"subscriber_id":144,"chat_id":"0123456789","first_name":"john","last_name":"Doe","email":"test@gmail.com","gender":"Male","created_at":"2026-04-07 10:30:00","assigned_agent_id":12,"assigned_agent":"Support Agent","bot_reply_label":"Bot Reply On","ai_reply_label":"AI Reply On","label_names":"Label1,Label2"}]}
WhatsApp API : Subscriber List
List of Subscribers

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/list
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
limit
Fetch number of subscribers.
Number|Required
offset
Offset of pagination.
Number|Optional
orderBy
Set this to 1 to sort the subscriber list by their most recent message (latest first). Set to 0 to keep the default order.
Number|Optional
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/list?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&limit=10&offset=1&orderBy=0
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/list' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'limit=10' \
-d 'offset=1' \
-d 'orderBy=0'
Sample Response
{"status":"1","message":[{"subscriber_id":144,"chat_id":"0123456789","first_name":"John","last_name":"Doe","email":"test@gmail.com","gender":"male","label_names":"One ,two"},{"subscriber_id":157,"chat_id":"0123456789","first_name":"john","last_name":"Doe","email":"null","gender":"Male","label_names":"ChatTest,remove tag,One"}]}
WhatsApp API : Subscriber Create
Create a Subscriber/Contact

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/create
apiToken
Your api key
String|Required
phoneNumberID
WhatsApp account phone number ID
String|Required
name
Name of your subscriber
String|Required
phoneNumber
Subscriber phone number with country code (without + sign)
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/create?apiToken=API-KEY&phoneNumberID=PHONE-NUMBER-ID&name=NAME&phoneNumber=MOBILE
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/create' \
-d 'apiToken=API-KEY' \
-d 'phoneNumberID=PHONE-NUMBER-ID' \
-d 'name=NAME' \
-d 'phoneNumber=MOBILE'
Sample Response
{"status":"1","mesasge":"WhatsApp subscriber has been created."}

{"status":"0","message":"WhatsApp account not found."}

{"status":"0","message":"Subscriber limit has been exceeded. You cannot have more subscribers."}

{"status":"0","message":"Something went wrong or subscriber already exist."}
WhatsApp API : Subscriber Update
Update an Existing Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/update
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
phone_number
Subscriber phone number
String|Required
first_name
First name of your subscriber
String|Optional
last_name
Last name of your subscriber
String|Optional
gender
Gender of your subscriber
String|Optional
label_ids
Label ids with comma separated like (1,4,5)
String|Optional
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/update?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER&first_name=FIRST-NAME&last_name=LAST-NAME&gender=GENDER&label_ids=LABEL-IDS
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/update' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'first_name=FIRST-NAME' \
-d 'last_name=LAST-NAME' \
-d 'gender=GENDER' \
-d 'label_ids=LABEL-IDS'
Sample Response
{"status":"1","message":"Subscriber Updated Successfully."}
WhatsApp API : Delete Subscriber
Delete Whatsapp Subscriber

API End-point : Delete Subscriber (GET/POST)
https://dash.botbiz.io/api/v1/whatsapp/subscriber/delete
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
phone_number
Must start with country code and only numeric characters are allowed
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/delete?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/delete' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER'
Sample Response
{"status":"1","message":"Subscriber has been deleted successfully."}
WhatsApp API : Reset User Input Flow
Reset User Input Flow

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/reset/user-input-flow
apiToken
Your api key
String|Required
phone_number_id
WhatsApp account phone number ID
String|Required
phone_number
Subscriber phone number
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/reset/user-input-flow?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/reset/user-input-flow' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER'
Sample Response
{"status":"1","message":"Reset User Input Flow successfully."}
WhatsApp API : Subscriber Assign Chat to Team
Assign a Subscriber`s Chat to a Team Member

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-to-team-member
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
team_member_id
Team Member ID
Integer|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-to-team-member?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&phone_number=PHONE-NUMBER&team_member_id=TEAM-MEMBER-ID
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-to-team-member' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'team_member_id=TEAM-MEMBER-ID'
Sample Response
{"status":"1","message":"Successfully Assign Agent to Conversation."}
WhatsApp API : Subscriber Assign Custom Fields
Assign Custom Field To Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-custom-fields
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
custom_fields
Custom fileds name and value in json format.
JSON|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-custom-fields' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'custom_fields={"custom_filed_name1": "custom_field_value1","custom_filed_name2": "custom_field_value2"}'
Sample Response
{"status":"1","message":"Subscriber changes have been saved successfully."}
WhatsApp API : Custom Fields List
Get List of Custom Fields

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/custom-fields/list
apiToken
Your api key
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/custom-fields/list' \
-d 'apiToken=API-KEY'
Sample Response
{"status":"1","message":"Custom fields retrieved successfully","data":[{"id":1,"name":"customer_name","reply_type":"text"},{"id":2,"name":"customer_email","reply_type":"email"}]}
WhatsApp API : Subscriber Assign Labels
Assign Labels To Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-labels
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
label_ids
Label ids with comma separated like (1,4,5)
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-labels' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'label_ids=LABEL-IDS'
Sample Response
{"status":"1","message":"Labels have been assigned successfully."}
WhatsApp API : Subscriber Remove Labels
Remove Labels To Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/remove-labels
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
label_ids
Label ids with comma separated like (1,4,5)
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/remove-labels' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'label_ids=LABEL-IDS'
Sample Response
{"status":"1","message":"Labels have been assigned successfully."}
WhatsApp API : Subscriber Assign Sequences
Assign Sequences To Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-sequence
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
sequence_ids
Label ids with comma separated like (1,4,5)
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/assign-sequence' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'sequence_ids=SEQUENCE-IDS'
Sample Response
{"status":"1","message":"Sequences have been assigned successfully."}
WhatsApp API : Subscriber Remove Sequences
Remove Sequence To Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/remove-sequence
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
sequence_ids
Sequence ids with comma separated like (1,4,5)
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/remove-sequence' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'sequence_ids=SEQUENCE-IDS'
Sample Response
{"status":"1","message":"Sequences have been removed successfully."}
WhatsApp API : Add Notes To Subscriber
Add Notes To Subscriber

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/add-notes
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
phone_number
Subscriber phone number
String|Required
note_text
Note text
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/subscriber/chat/add-notes' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'phone_number=PHONE-NUMBER' \
-d 'note_text=NOTE-TEXT'
Sample Response
{"status":"1","message":"Notes have been added successfully."}
WhatsApp API : Label List
List of Labels

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/label/list
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/label/list?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/label/list' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID'
Sample Response
{"status":"1","message":[{"id":1,"label_name":"Your label name","status":"1"}]}
WhatsApp API : Label Create
Create a Label

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/label/create
apiToken
Your api key
String|Required
phone_number_id
Your whatsapp phone number id
String|Required
label_name
Label Name
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/label/create?apiToken=API-KEY&phone_number_id=PHONE-NUMBER-ID&label_name=LABEL-NAME
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/label/create' \
-d 'apiToken=API-KEY' \
-d 'phone_number_id=PHONE-NUMBER-ID' \
-d 'label_name=LABEL-NAME'
Sample Response
{"status":"1","message":"Label has been created successfully."}
WhatsApp API : Catalog List
Catalog List

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/catalog/list
apiToken
Your api key
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/catalog/list?apiToken=API-KEY
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/catalog/list' \
-d 'apiToken=API-KEY'
Sample Response
{"status":true,"message":[{"catalog_id":"1429267xxxx5095","catalog_name":"The White","catalog_url":"https:xxxxx","checkout_settings":"{"tax_percentage":"5.5","shipping_charge":"20"}"}]}
WhatsApp Catalog : Sync
Catalog Sync

API End-point : POST
https://dash.botbiz.io/api/v1/whatsapp/catalog/sync
apiToken
Your api key
String|Required
whatsapp_catalog_id
Your whatsapp catalog id
String|Required
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/catalog/sync' \
-d 'apiToken=API-KEY' \
-d 'whatsapp_catalog_id=WHATSAPP-CATALOG-ID'
Sample Response
{"status":"1","message":"Catalog products have been synced successfully."}
WhatsApp API : Catalog Order List
Catalog List

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/catalog/order/list
apiToken
Your api key
String|Required
whatsapp_catalog_id
Your whatsapp catalog id
String|Optional
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/catalog/order/list?apiToken=API-KEY&whatsapp_catalog_id=WHATSAPP-CATALOG-ID
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/catalog/order/list' \
-d 'apiToken=API-KEY' \
-d 'whatsapp_catalog_id=WHATSAPP-CATALOG-ID'
Sample Response
{"status":"1","message":[{"order_unique_id":"172310467380123456789","catalog_id":"762561142206860","chat_id":"0123456789","catalog_name":"Catalog Name","first_name":"John","cart_total":4300,"cart_currency":"USD","cart_status_raw":"Submitted","ordered_at":"2024-08-08 08:11:13","updated_at":"2024-08-08 08:30:40","payment_amount":4300,"payment_method":"Cash on Delivery","shipping_address":"{\"name\":\"John Doe\",\"phone_number\":\"0123456789\",\"email\":\"test@gmail.com\",\"address\":\"pti road\"}","checkout_account_email":null,"checkout_amount":"0","checkout_timestamp":null,"transaction_id":"PD1723104673012345678933FAD1","paid_at":"2024-08-08 08:30:40","status_changed_at":"2024-08-08 08:30:40"}]}
WhatsApp API : Catalog Order Status Change
Change Catalog Order Status

API End-point : GET/POST
https://dash.botbiz.io/api/v1/whatsapp/catalog/order/status-change
apiToken
Your api key
String|Required
order_unique_id
Your Catalog Order ID
String|Required
cart_status
Status value should be Approved|Completed|Shipped|Delivered|Refunded
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/whatsapp/catalog/order/status-change?apiToken=API-KEY&order_unique_id=ORDER-UNIQUE-ID&cart_status=CART-STATUS
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/whatsapp/catalog/order/status-change' \
-d 'apiToken=API-KEY' \
-d 'order_unique_id=ORDER-UNIQUE-ID' \
-d 'cart_status=CART-STATUS'
Sample Response
{"status":true,"message":"Cart status has been updated successfully"}
User API : Get Direct Login Url
An Unique and Secure One-time Login URL

API End-point : GET/POST
https://dash.botbiz.io/api/v1/user/get/direct-login-url
apiToken
Your api key
String|Required
email
Email of your user
Email|Required
name
Name of your user
String|Optional
mobile
User phone number
String|Optional
package_id
Package Id
Integer|Required for new user
expired_date
Package Expired date like (2023-09-12)
String|Required for new user
status
Status of user active(1) inactive(0)
String|Optional
create_on_fail
Set Value 1 for If user not found, create new user with this data or Set(0) it will return User not found error
Boolean|Optional
GET Request Example
https://dash.botbiz.io/api/v1/user/get/direct-login-url?apiToken=API-KEY&email=EMAIL&name=NAME&mobile=MOBILE&package_id=NAME&expired_date=EXPIRED-DATE&status=STATUS&create_on_fail=1
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/user/get/direct-login-url' \
-d 'apiToken=API-KEY' \
-d 'email=EMAIL' \
-d 'name=NAME' \
-d 'mobile=MOBILE' \
-d 'package_id=NAME' \
-d 'expired_date=EXPIRED-DATE' \
-d 'status=STATUS' \
-d 'create_on_fail=1'
Sample Response
{"status":"1","message":{"email":"user@domain.com","password":"xxxxxxxxxx","login_url":"https://dash.botbiz.io/login","direct_login_url":"https://dash.botbiz.io/direct-login/xxxxxxxxxx"}}
User API : Get direct login url only for new users
Create user if not exists and return one-time direct login url. If user exists, it will return `User already existed`.

API End-point : GET/POST
https://dash.botbiz.io/api/v1/user/get/direct-login-url/only-new-users
apiToken
Your api key
String|Required
email
Email of your user
Email|Required
package_id
Package Id
Integer|Required
expired_date
Package Expired date like (2026-05-05)
String|Required
GET Request Example
https://dash.botbiz.io/api/v1/user/get/direct-login-url/only-new-users?apiToken=API-KEY&email=EMAIL&package_id=PACKAGE-ID&expired_date=EXPIRED-DATE
POST Request Example
curl -X POST \
'https://dash.botbiz.io/api/v1/user/get/direct-login-url/only-new-users' \
-d 'apiToken=API-KEY' \
-d 'email=EMAIL' \
-d 'package_id=PACKAGE-ID' \
-d 'expired_date=EXPIRED-DATE'
Sample Response (Success)
{"status":"1","message":{"email":"user@domain.com","password":"xxxxxxxxxx","login_url":"https://dash.botbiz.io/login","direct_login_url":"https://dash.botbiz.io/direct-login/xxxxxxxxxx"}}
Sample Response (Existing User)
{"status":"0","message":"User already existed"}



