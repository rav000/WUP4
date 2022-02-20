
var g_bSurveyOn = false ; // turn OFF the survey

function fnInitWebIQ(){ 
    var bAlreadyShownInvite, sReturnValue, sDialogFeatures;
    if(Math.random()*1500 <= 1){
        bAlreadyShownInvite = (eTOC.g_oUserData.getAttribute("webiqinvited") == "1");
        if(!bAlreadyShownInvite && g_bSurveyOn){
			eTOC.g_oUserData.setAttribute("webiqinvited", "1");
			eTOC.g_oUserData.save("oWindowsUpdate");
            sDialogFeatures = "dialogHeight:420px;dialogWidth:541px;help:0;resizable:yes;status:no";
            sReturnValue = window.showModalDialog("/en/webiq.htm", "", sDialogFeatures);
            if(sReturnValue == "accept") window.open("https://www.webiqonline.com/webhq/hq18/index.asp", "webiqsurvey", "height=420px,width=539px,scrollbars=yes,top=100,left=100,resizable=yes");
            
        }
    }
}
