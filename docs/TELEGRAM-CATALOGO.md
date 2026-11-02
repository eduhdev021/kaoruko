# Catalogo de referencia da Bot API

Fonte de tipos: @grammyjs/types 5.0.0 (MIT). 185 metodos catalogados.
Este e um indice de referencia, NAO uma afirmacao de implementacao ou homologacao de todos os metodos. Nao existe endpoint publico para executa-los arbitrariamente. Use os modulos autorizados da plataforma.

| Metodo | Campos obrigatorios de primeiro nivel |
|---|---|
| [addStickerToSet](https://core.telegram.org/bots/api#addstickertoset) | user_id, name, sticker |
| [answerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery) | callback_query_id |
| [answerChatJoinRequestQuery](https://core.telegram.org/bots/api#answerchatjoinrequestquery) | chat_join_request_query_id, result |
| [answerGuestQuery](https://core.telegram.org/bots/api#answerguestquery) | guest_query_id, result |
| [answerInlineQuery](https://core.telegram.org/bots/api#answerinlinequery) | inline_query_id, results |
| [answerPreCheckoutQuery](https://core.telegram.org/bots/api#answerprecheckoutquery) | pre_checkout_query_id, ok |
| [answerShippingQuery](https://core.telegram.org/bots/api#answershippingquery) | shipping_query_id, ok |
| [answerWebAppQuery](https://core.telegram.org/bots/api#answerwebappquery) | web_app_query_id, result |
| [approveChatJoinRequest](https://core.telegram.org/bots/api#approvechatjoinrequest) | chat_id, user_id |
| [approveSuggestedPost](https://core.telegram.org/bots/api#approvesuggestedpost) | chat_id, message_id |
| [banChatMember](https://core.telegram.org/bots/api#banchatmember) | chat_id, user_id |
| [banChatSenderChat](https://core.telegram.org/bots/api#banchatsenderchat) | chat_id, sender_chat_id |
| [close](https://core.telegram.org/bots/api#close) | — |
| [closeForumTopic](https://core.telegram.org/bots/api#closeforumtopic) | chat_id, message_thread_id |
| [closeGeneralForumTopic](https://core.telegram.org/bots/api#closegeneralforumtopic) | chat_id |
| [convertGiftToStars](https://core.telegram.org/bots/api#convertgifttostars) | business_connection_id, owned_gift_id |
| [copyMessage](https://core.telegram.org/bots/api#copymessage) | chat_id, from_chat_id, message_id |
| [copyMessages](https://core.telegram.org/bots/api#copymessages) | chat_id, from_chat_id, message_ids |
| [createChatInviteLink](https://core.telegram.org/bots/api#createchatinvitelink) | chat_id |
| [createChatSubscriptionInviteLink](https://core.telegram.org/bots/api#createchatsubscriptioninvitelink) | chat_id, subscription_period, subscription_price |
| [createForumTopic](https://core.telegram.org/bots/api#createforumtopic) | chat_id, name |
| [createInvoiceLink](https://core.telegram.org/bots/api#createinvoicelink) | title, description, payload, currency, prices |
| [createNewStickerSet](https://core.telegram.org/bots/api#createnewstickerset) | user_id, name, title, stickers |
| [declineChatJoinRequest](https://core.telegram.org/bots/api#declinechatjoinrequest) | chat_id, user_id |
| [declineSuggestedPost](https://core.telegram.org/bots/api#declinesuggestedpost) | chat_id, message_id |
| [deleteAllMessageReactions](https://core.telegram.org/bots/api#deleteallmessagereactions) | chat_id |
| [deleteBusinessMessages](https://core.telegram.org/bots/api#deletebusinessmessages) | business_connection_id, message_ids |
| [deleteChatPhoto](https://core.telegram.org/bots/api#deletechatphoto) | chat_id |
| [deleteChatStickerSet](https://core.telegram.org/bots/api#deletechatstickerset) | chat_id |
| [deleteEphemeralMessage](https://core.telegram.org/bots/api#deleteephemeralmessage) | chat_id, receiver_user_id, ephemeral_message_id |
| [deleteForumTopic](https://core.telegram.org/bots/api#deleteforumtopic) | chat_id, message_thread_id |
| [deleteMessage](https://core.telegram.org/bots/api#deletemessage) | chat_id, message_id |
| [deleteMessageReaction](https://core.telegram.org/bots/api#deletemessagereaction) | chat_id, message_id |
| [deleteMessages](https://core.telegram.org/bots/api#deletemessages) | chat_id, message_ids |
| [deleteMyCommands](https://core.telegram.org/bots/api#deletemycommands) | — |
| [deleteStickerFromSet](https://core.telegram.org/bots/api#deletestickerfromset) | sticker |
| [deleteStickerSet](https://core.telegram.org/bots/api#deletestickerset) | name |
| [deleteStory](https://core.telegram.org/bots/api#deletestory) | business_connection_id, story_id |
| [deleteWebhook](https://core.telegram.org/bots/api#deletewebhook) | — |
| [editChatInviteLink](https://core.telegram.org/bots/api#editchatinvitelink) | chat_id, invite_link |
| [editChatSubscriptionInviteLink](https://core.telegram.org/bots/api#editchatsubscriptioninvitelink) | chat_id, invite_link |
| [editEphemeralMessageCaption](https://core.telegram.org/bots/api#editephemeralmessagecaption) | chat_id, receiver_user_id, ephemeral_message_id |
| [editEphemeralMessageMedia](https://core.telegram.org/bots/api#editephemeralmessagemedia) | chat_id, receiver_user_id, ephemeral_message_id, media |
| [editEphemeralMessageReplyMarkup](https://core.telegram.org/bots/api#editephemeralmessagereplymarkup) | chat_id, receiver_user_id, ephemeral_message_id |
| [editEphemeralMessageText](https://core.telegram.org/bots/api#editephemeralmessagetext) | chat_id, receiver_user_id, ephemeral_message_id |
| [editForumTopic](https://core.telegram.org/bots/api#editforumtopic) | chat_id, message_thread_id |
| [editGeneralForumTopic](https://core.telegram.org/bots/api#editgeneralforumtopic) | chat_id, name |
| [editMessageCaption](https://core.telegram.org/bots/api#editmessagecaption) | — |
| [editMessageChecklist](https://core.telegram.org/bots/api#editmessagechecklist) | business_connection_id, chat_id, message_id, checklist |
| [editMessageLiveLocation](https://core.telegram.org/bots/api#editmessagelivelocation) | latitude, longitude |
| [editMessageMedia](https://core.telegram.org/bots/api#editmessagemedia) | media |
| [editMessageReplyMarkup](https://core.telegram.org/bots/api#editmessagereplymarkup) | — |
| [editMessageText](https://core.telegram.org/bots/api#editmessagetext) | — |
| [editStory](https://core.telegram.org/bots/api#editstory) | business_connection_id, story_id, content |
| [editUserStarSubscription](https://core.telegram.org/bots/api#edituserstarsubscription) | user_id, telegram_payment_charge_id, is_canceled |
| [exportChatInviteLink](https://core.telegram.org/bots/api#exportchatinvitelink) | chat_id |
| [forwardMessage](https://core.telegram.org/bots/api#forwardmessage) | chat_id, from_chat_id, message_id |
| [forwardMessages](https://core.telegram.org/bots/api#forwardmessages) | chat_id, from_chat_id, message_ids |
| [getAvailableGifts](https://core.telegram.org/bots/api#getavailablegifts) | — |
| [getBusinessAccountGifts](https://core.telegram.org/bots/api#getbusinessaccountgifts) | business_connection_id |
| [getBusinessAccountStarBalance](https://core.telegram.org/bots/api#getbusinessaccountstarbalance) | business_connection_id |
| [getBusinessConnection](https://core.telegram.org/bots/api#getbusinessconnection) | business_connection_id |
| [getChat](https://core.telegram.org/bots/api#getchat) | chat_id |
| [getChatAdministrators](https://core.telegram.org/bots/api#getchatadministrators) | chat_id |
| [getChatGifts](https://core.telegram.org/bots/api#getchatgifts) | chat_id |
| [getChatMember](https://core.telegram.org/bots/api#getchatmember) | chat_id, user_id |
| [getChatMemberCount](https://core.telegram.org/bots/api#getchatmembercount) | chat_id |
| [getChatMenuButton](https://core.telegram.org/bots/api#getchatmenubutton) | — |
| [getCustomEmojiStickers](https://core.telegram.org/bots/api#getcustomemojistickers) | custom_emoji_ids |
| [getFile](https://core.telegram.org/bots/api#getfile) | file_id |
| [getForumTopicIconStickers](https://core.telegram.org/bots/api#getforumtopiciconstickers) | — |
| [getGameHighScores](https://core.telegram.org/bots/api#getgamehighscores) | user_id |
| [getManagedBotAccessSettings](https://core.telegram.org/bots/api#getmanagedbotaccesssettings) | user_id |
| [getManagedBotToken](https://core.telegram.org/bots/api#getmanagedbottoken) | user_id |
| [getMe](https://core.telegram.org/bots/api#getme) | — |
| [getMyCommands](https://core.telegram.org/bots/api#getmycommands) | — |
| [getMyDefaultAdministratorRights](https://core.telegram.org/bots/api#getmydefaultadministratorrights) | — |
| [getMyDescription](https://core.telegram.org/bots/api#getmydescription) | — |
| [getMyName](https://core.telegram.org/bots/api#getmyname) | — |
| [getMyShortDescription](https://core.telegram.org/bots/api#getmyshortdescription) | — |
| [getMyStarBalance](https://core.telegram.org/bots/api#getmystarbalance) | — |
| [getStarTransactions](https://core.telegram.org/bots/api#getstartransactions) | — |
| [getStickerSet](https://core.telegram.org/bots/api#getstickerset) | name |
| [getUpdates](https://core.telegram.org/bots/api#getupdates) | — |
| [getUserChatBoosts](https://core.telegram.org/bots/api#getuserchatboosts) | chat_id, user_id |
| [getUserGifts](https://core.telegram.org/bots/api#getusergifts) | user_id |
| [getUserPersonalChatMessages](https://core.telegram.org/bots/api#getuserpersonalchatmessages) | user_id, limit |
| [getUserProfileAudios](https://core.telegram.org/bots/api#getuserprofileaudios) | user_id |
| [getUserProfilePhotos](https://core.telegram.org/bots/api#getuserprofilephotos) | user_id |
| [getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo) | — |
| [giftPremiumSubscription](https://core.telegram.org/bots/api#giftpremiumsubscription) | user_id, month_count, star_count |
| [hideGeneralForumTopic](https://core.telegram.org/bots/api#hidegeneralforumtopic) | chat_id |
| [leaveChat](https://core.telegram.org/bots/api#leavechat) | chat_id |
| [logOut](https://core.telegram.org/bots/api#logout) | — |
| [pinChatMessage](https://core.telegram.org/bots/api#pinchatmessage) | chat_id, message_id |
| [postStory](https://core.telegram.org/bots/api#poststory) | business_connection_id, content, active_period |
| [promoteChatMember](https://core.telegram.org/bots/api#promotechatmember) | chat_id, user_id |
| [readBusinessMessage](https://core.telegram.org/bots/api#readbusinessmessage) | business_connection_id, chat_id, message_id |
| [refundStarPayment](https://core.telegram.org/bots/api#refundstarpayment) | user_id, telegram_payment_charge_id |
| [removeBusinessAccountProfilePhoto](https://core.telegram.org/bots/api#removebusinessaccountprofilephoto) | business_connection_id |
| [removeChatVerification](https://core.telegram.org/bots/api#removechatverification) | chat_id |
| [removeMyProfilePhoto](https://core.telegram.org/bots/api#removemyprofilephoto) | — |
| [removeUserVerification](https://core.telegram.org/bots/api#removeuserverification) | user_id |
| [reopenForumTopic](https://core.telegram.org/bots/api#reopenforumtopic) | chat_id, message_thread_id |
| [reopenGeneralForumTopic](https://core.telegram.org/bots/api#reopengeneralforumtopic) | chat_id |
| [replaceManagedBotToken](https://core.telegram.org/bots/api#replacemanagedbottoken) | user_id |
| [replaceStickerInSet](https://core.telegram.org/bots/api#replacestickerinset) | user_id, name, old_sticker, sticker |
| [repostStory](https://core.telegram.org/bots/api#repoststory) | business_connection_id, from_chat_id, from_story_id, active_period |
| [restrictChatMember](https://core.telegram.org/bots/api#restrictchatmember) | chat_id, user_id, permissions |
| [revokeChatInviteLink](https://core.telegram.org/bots/api#revokechatinvitelink) | chat_id, invite_link |
| [savePreparedInlineMessage](https://core.telegram.org/bots/api#savepreparedinlinemessage) | user_id, result |
| [savePreparedKeyboardButton](https://core.telegram.org/bots/api#savepreparedkeyboardbutton) | user_id, button |
| [sendAnimation](https://core.telegram.org/bots/api#sendanimation) | chat_id, animation |
| [sendAudio](https://core.telegram.org/bots/api#sendaudio) | chat_id, audio |
| [sendChatAction](https://core.telegram.org/bots/api#sendchataction) | chat_id, action |
| [sendChatJoinRequestWebApp](https://core.telegram.org/bots/api#sendchatjoinrequestwebapp) | chat_join_request_query_id, web_app_url |
| [sendChecklist](https://core.telegram.org/bots/api#sendchecklist) | business_connection_id, chat_id, checklist |
| [sendContact](https://core.telegram.org/bots/api#sendcontact) | chat_id, phone_number, first_name |
| [sendDice](https://core.telegram.org/bots/api#senddice) | chat_id |
| [sendDocument](https://core.telegram.org/bots/api#senddocument) | chat_id, document |
| [sendGame](https://core.telegram.org/bots/api#sendgame) | chat_id, game_short_name |
| [sendGift](https://core.telegram.org/bots/api#sendgift) | gift_id |
| [sendInvoice](https://core.telegram.org/bots/api#sendinvoice) | chat_id, title, description, payload, currency, prices |
| [sendLivePhoto](https://core.telegram.org/bots/api#sendlivephoto) | chat_id, live_photo, photo |
| [sendLocation](https://core.telegram.org/bots/api#sendlocation) | chat_id, latitude, longitude |
| [sendMediaGroup](https://core.telegram.org/bots/api#sendmediagroup) | chat_id, media |
| [sendMessage](https://core.telegram.org/bots/api#sendmessage) | chat_id, text |
| [sendMessageDraft](https://core.telegram.org/bots/api#sendmessagedraft) | chat_id, draft_id |
| [sendPaidMedia](https://core.telegram.org/bots/api#sendpaidmedia) | chat_id, star_count, media |
| [sendPhoto](https://core.telegram.org/bots/api#sendphoto) | chat_id, photo |
| [sendPoll](https://core.telegram.org/bots/api#sendpoll) | chat_id, question, options |
| [sendRichMessage](https://core.telegram.org/bots/api#sendrichmessage) | chat_id, rich_message |
| [sendRichMessageDraft](https://core.telegram.org/bots/api#sendrichmessagedraft) | chat_id, draft_id, rich_message |
| [sendSticker](https://core.telegram.org/bots/api#sendsticker) | chat_id, sticker |
| [sendVenue](https://core.telegram.org/bots/api#sendvenue) | chat_id, latitude, longitude, title, address |
| [sendVideo](https://core.telegram.org/bots/api#sendvideo) | chat_id, video |
| [sendVideoNote](https://core.telegram.org/bots/api#sendvideonote) | chat_id, video_note |
| [sendVoice](https://core.telegram.org/bots/api#sendvoice) | chat_id, voice |
| [setBusinessAccountBio](https://core.telegram.org/bots/api#setbusinessaccountbio) | business_connection_id |
| [setBusinessAccountGiftSettings](https://core.telegram.org/bots/api#setbusinessaccountgiftsettings) | business_connection_id, show_gift_button, accepted_gift_types |
| [setBusinessAccountName](https://core.telegram.org/bots/api#setbusinessaccountname) | business_connection_id, first_name |
| [setBusinessAccountProfilePhoto](https://core.telegram.org/bots/api#setbusinessaccountprofilephoto) | business_connection_id, photo |
| [setBusinessAccountUsername](https://core.telegram.org/bots/api#setbusinessaccountusername) | business_connection_id |
| [setChatAdministratorCustomTitle](https://core.telegram.org/bots/api#setchatadministratorcustomtitle) | chat_id, user_id, custom_title |
| [setChatDescription](https://core.telegram.org/bots/api#setchatdescription) | chat_id |
| [setChatMemberTag](https://core.telegram.org/bots/api#setchatmembertag) | chat_id, user_id |
| [setChatMenuButton](https://core.telegram.org/bots/api#setchatmenubutton) | — |
| [setChatPermissions](https://core.telegram.org/bots/api#setchatpermissions) | chat_id, permissions |
| [setChatPhoto](https://core.telegram.org/bots/api#setchatphoto) | chat_id, photo |
| [setChatStickerSet](https://core.telegram.org/bots/api#setchatstickerset) | chat_id, sticker_set_name |
| [setChatTitle](https://core.telegram.org/bots/api#setchattitle) | chat_id, title |
| [setCustomEmojiStickerSetThumbnail](https://core.telegram.org/bots/api#setcustomemojistickersetthumbnail) | name |
| [setGameScore](https://core.telegram.org/bots/api#setgamescore) | user_id, score |
| [setManagedBotAccessSettings](https://core.telegram.org/bots/api#setmanagedbotaccesssettings) | user_id, is_access_restricted |
| [setMessageReaction](https://core.telegram.org/bots/api#setmessagereaction) | chat_id, message_id |
| [setMyCommands](https://core.telegram.org/bots/api#setmycommands) | commands |
| [setMyDefaultAdministratorRights](https://core.telegram.org/bots/api#setmydefaultadministratorrights) | — |
| [setMyDescription](https://core.telegram.org/bots/api#setmydescription) | — |
| [setMyName](https://core.telegram.org/bots/api#setmyname) | — |
| [setMyProfilePhoto](https://core.telegram.org/bots/api#setmyprofilephoto) | photo |
| [setMyShortDescription](https://core.telegram.org/bots/api#setmyshortdescription) | — |
| [setPassportDataErrors](https://core.telegram.org/bots/api#setpassportdataerrors) | user_id, errors |
| [setStickerEmojiList](https://core.telegram.org/bots/api#setstickeremojilist) | sticker, emoji_list |
| [setStickerKeywords](https://core.telegram.org/bots/api#setstickerkeywords) | sticker |
| [setStickerMaskPosition](https://core.telegram.org/bots/api#setstickermaskposition) | sticker |
| [setStickerPositionInSet](https://core.telegram.org/bots/api#setstickerpositioninset) | sticker, position |
| [setStickerSetThumbnail](https://core.telegram.org/bots/api#setstickersetthumbnail) | name, user_id, format |
| [setStickerSetTitle](https://core.telegram.org/bots/api#setstickersettitle) | name, title |
| [setUserEmojiStatus](https://core.telegram.org/bots/api#setuseremojistatus) | user_id |
| [setWebhook](https://core.telegram.org/bots/api#setwebhook) | url |
| [stopMessageLiveLocation](https://core.telegram.org/bots/api#stopmessagelivelocation) | — |
| [stopPoll](https://core.telegram.org/bots/api#stoppoll) | chat_id, message_id |
| [transferBusinessAccountStars](https://core.telegram.org/bots/api#transferbusinessaccountstars) | business_connection_id, star_count |
| [transferGift](https://core.telegram.org/bots/api#transfergift) | business_connection_id, owned_gift_id, new_owner_chat_id, star_count |
| [unbanChatMember](https://core.telegram.org/bots/api#unbanchatmember) | chat_id, user_id |
| [unbanChatSenderChat](https://core.telegram.org/bots/api#unbanchatsenderchat) | chat_id, sender_chat_id |
| [unhideGeneralForumTopic](https://core.telegram.org/bots/api#unhidegeneralforumtopic) | chat_id |
| [unpinAllChatMessages](https://core.telegram.org/bots/api#unpinallchatmessages) | chat_id |
| [unpinAllForumTopicMessages](https://core.telegram.org/bots/api#unpinallforumtopicmessages) | chat_id, message_thread_id |
| [unpinAllGeneralForumTopicMessages](https://core.telegram.org/bots/api#unpinallgeneralforumtopicmessages) | chat_id |
| [unpinChatMessage](https://core.telegram.org/bots/api#unpinchatmessage) | chat_id |
| [upgradeGift](https://core.telegram.org/bots/api#upgradegift) | business_connection_id, owned_gift_id |
| [uploadStickerFile](https://core.telegram.org/bots/api#uploadstickerfile) | user_id, sticker_format, sticker |
| [verifyChat](https://core.telegram.org/bots/api#verifychat) | chat_id |
| [verifyUser](https://core.telegram.org/bots/api#verifyuser) | user_id |
