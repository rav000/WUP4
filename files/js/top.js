/* constants */

var conOtherPage = -1;
var conOtherSubPage = -1;

var conErrorPage = 0;
var conSplashPage = 1;
var conResultsPage = 2;
var conThanksPage = 3;
var conHistoryPage = 4;
var conAboutPage = 5;
var conSupportPage = 6;
var conStatusPage = 7;
var conEULAPage = 9;
var conDownloadPage = 10;
var conLearnAboutPage = 11;
var conPersonalizationPage = 12;

var conErrorOther = -1;
var conErrorNone = 0;
var conErrorNoScripting = 1;
var conErrorNoActiveX = 2;
var conErrorNotAdmin = 3;
var conErrorDisabled = 4;
var conErrorNoControl = 5;
var conErrorOldControl = 6;
var conErrorOldEngine = 7;
var conErrorControlFailed = 8;
var conErrorControlUpdateFailed = 9;
var conErrorInstallationCanceled = 10;
var conErrorDiskFull = 11;
var conErrorProxy = 12;
var conErrorNetwork = 13;
var conErrorServer = 14;
var conErrorBannedVLK = 15;
var conErrorNoIELang = 16;
var conErrorSystemTimeOff = 17;
var conErrorXmlDom = 18;

var conResultsCritical = 0;
var conResultsProduct = 1;
var conResultsBasket = 2;
var conResultsDrivers = 3;

var conSplashCheckingControl = 0;
var conSplashInstallingControl = 1;
var conSplashInstallingEngine = 2;
var conSplashWelcome = 3;
var conSplashScanning = 4;

var conSplashPickUpdatesCritical = 5;
var conSplashPickUpdatesCriticalAndOther = 6;
var conSplashPickUpdatesOther = 7;
var conSplashPickUpdatesNone = 8;
var conSplashInstallingWait = 9;

var IU_INIT_CHECK = 0;
var IU_INIT_UPDATE_ASYNC = 2;
var IU_UPDATE_OK = 0;
var IU_UPDATE_CONTROL_BIT = 1;
var IU_UPDATE_ENGINE_BIT = 2;
var IU_UPDATE_CONTROL_AND_ENGINE_BIT = 3;
var UPDATE_COMMAND_CANCEL = 0x0000004;
var UPDATE_CORPORATE_MODE = 0x0000200;
var UPDATE_NOTIFICATION_ANYPROGRESS = 0x0000000;
var ERROR_INVALID_PROPERTY = -2146827850;
var UPDATE_ERROR_ACCESS_DENIED = -2146828218;
var UPDATE_ERROR_Q269688 = -2147217422;
var WIN32_ERROR_DISK_FULL = -2147024784;
var WIN32_ERROR_SERVICE_DISABLED = -2147023838;
var WIN32_ERROR_NETWORK_ACCESS_DENIED = -2147024831;
var WIN32_ERROR_ACCESS_DENIED = -2147024891;
var WIN32_ERROR_ACCESS_DENIED2 = -2147483639;
var WIN32_ERROR_CANCELLED	= -2147023673
var ERROR_FILE_NOT_FOUND	= -2147024894
var ERROR_PATH_NOT_FOUND	= -2147024893
var ERROR_CANNOT_MAKE		= -2147024814
var ERROR_WRITE_PROTECT		= -2147024877
var ERROR_WRITE_FAULT		= -2147024867
var HTTP_STATUS_LENGTH_REQUIRED = -2147024485;
var HTTP_STATUS_PROXY_AUTH_REQ = -2147024489;
var HTTP_STATUS_GATEWAY_TIMEOUT = -2147024392;
var HTTP_ERROR_502 = -2145844746;
var ERROR_INTERNET_NAME_NOT_RESOLVED = -2147012889;
var ERROR_INTERNET_CANNOT_CONNECT = -2147012867;
var ERROR_INTERNET_CONNECTION_RESET = -2147012865;
var ERROR_OPERATION_ABORTED = -2147467260;
var WIN32_PATH_NOT_FOUND = -2147024893;
var WIN32_INVALID_URL = -2146697214;
var WIN32_CANNOT_DOWNLOAD = -2146697208;
var WIN32_SUBJECT_NOT_TRUSTED = -2146762748;
var ERROR_E_FAIL = 0x80004005;
var Error_XmlDom_Reason1 = -2147746132;
var Error_XmlDom_Reason2 = -2148139437;
var Error_XmlDom_Reason3 = -2147942526;
var Error_XmlDom_Reason4 = -2146828281;


/* constants */
/* global variables */

var CatalogXML, g_oCatalogXML, g_oInstallationXML, g_oControl, g_oPopup, g_oDownloadPopup;
var g_sExclusiveUpdateTitle, g_sRegionalSettings, g_sUUIDOperation, g_sDownloadPath, g_sOperationResultXML;
var g_iCatalogBasketCount, g_iConsumerBasketCount, g_iConsumerBasketSize, g_iConnectionSpeed, g_iSplashPage, g_iOnProgressTimer;
var g_bPosted, g_bScanning, g_bDetectedItems, g_bOnSplashPage, g_bPersonalizing, g_bEULAAccepted, g_bX86, g_bOSIsServer, g_bSaveXML, g_bSall, g_bSinst, g_bNeedsReboot, g_bAutoUpdateEnabled, g_bDownloading, g_bInstalling, g_bCancelInstall;
var g_aProductIDs, g_aDependencies, g_sComputerSystemBlob,g_bBannedVLK,g_bCatalogDenied;
var g_bControlInitialized = false;
var g_bDriversFailed = false ;


/* global variables */
/* init */

function window.onload(){
	fnInit();
}

function window.onbeforeunload(){
	if(g_oDownloadPopup != null) return L_CancelInstall2_Text;
}

function window.onunload(){
	control_SetOperationMode("", UPDATE_COMMAND_CANCEL);
}

function fnInit(){
	var sCurrentURL, sWelcomePage, sErrorPage;

	if("undefined" == typeof(conQueryString) || "object" != typeof(eContent) || "object" != typeof(eTOC) || "function" != typeof(eTOC.fnDisableTOC)){
		window.setTimeout("fnInit();", 0);
		return false;
	}
   
   
	g_sRegionalSettings = "";  // initialize all the global variables 
	g_sDownloadPath = "";
	g_bDownloading = false;
	g_bInstalling = false;
	g_bNeedsReboot = false;
	g_bPosted = false;
	g_bScanning = false;
	g_bPersonalizing = false;
	g_bDetectedItems = false;
	g_bSaveXML = false;
	g_bSall = false;
	g_bSinst = false;
	g_bOnSplashPage = false;
	g_bAutoUpdateEnabled = false;
	g_bX86 = (window.navigator.cpuClass == "x86");
	g_iConnectionSpeed = 0;
	g_iConsumerBasketCount = 0;
	g_iConsumerBasketSize = 0;
	g_bCorporate = (eTOC.location.href.indexOf("corporate=true") != -1);

	eTOC.fnInitTOC(); // writes the onmouseevent of all links in toc.asp

	sCurrentURL = eContent.location.href.toLowerCase();
	sWelcomePage = "http://" + window.location.host + conConsumerURL + "splash.asp?page=" + conSplashCheckingControl + "&corporate=" + g_bCorporate + "&" + conQueryString;
	sErrorPage = "http://" + window.location.host + conConsumerURL + "error.asp?error=" + conErrorControlUpdateFailed + "&corporate=" + g_bCorporate + "&" + conQueryString;

	if(window.location.search.indexOf("page=") == -1 && !g_bControlInitialized && sCurrentURL != sWelcomePage && sCurrentURL != sErrorPage){   // this is to display Control checking page when user backs in to the website
		fnDisplaySplashPage(conSplashCheckingControl);
	}else{
		g_iSplashPage = conSplashWelcome;
		g_bOnSplashPage = true;
	}
}

function fnCreateCatalogXML(){ // creates an empty catalog xml
	CatalogXML = xmlNewXML();
	CatalogXML.loadXML("<catalog />");
	g_oCatalogXML = CatalogXML.documentElement;
	fnDetectSystemSpecs();
}

function fnDetectSystemSpecs(){
	var sXML, oXML, oRoot, oAdminAttribute, bNotAdmin, sOSLocale, oRegExp;

	sXML = control_GetSystemSpec("<classes><computerSystem /><platform /><locale /></classes>");
	if(sXML == false) return false;

	oXML = xmlNewXML();
	oXML.loadXML(sXML);
	oRoot = oXML.documentElement;

	oRegExp = /^sk|sl|el_ibm|en_arabic|en_hebrew|en_thai/i;
	sOSLocale = oRoot.selectSingleNode("locale[@context = 'OS']/language").text;
	if(oRegExp.test(sOSLocale)){
		window.location.href = "http://windowsupdate.microsoft.com/Static_Locale/V31site";
		return false;
	}

	if(oRoot.selectSingleNode("computerSystem[@windowsUpdateDisabled = '1']") != null){ // if windows update is disabled by policy setting
		fnDisplayErrorPage(conErrorDisabled, true);
		return false;
	}

	if(conWinNT){
		if(oRoot.selectSingleNode("platform/productType[suite = 'VER_SUITE_DATACENTER']") != null){ // if it is a datacenter show thanks page
			window.location.replace(conConsumerURL + "thanks.asp?os=dtc");
		}else{
			oAdminAttribute = oRoot.selectSingleNode("computerSystem/@administrator");
			bNotAdmin = (oAdminAttribute != null && oAdminAttribute.text != "1"); // check if the user is admin or not on the local machine

			if(bNotAdmin){
				fnDisplayErrorPage(conErrorNotAdmin, true);
				eTOC.eWelcome.href = conConsumerURL + "error.asp?error=" + conErrorNotAdmin + "&" + conQueryString;
				eTOC.eWelcome.onclick = null;
				eTOC.fnEnableLink(eTOC.eAvailableUpdates, false); // disable link
				return false;
			}
		}
	}

	if(!g_bCorporate){
		oOEMURL = oRoot.selectSingleNode("computerSystem/@supportSite");
		if(oOEMURL != null && oOEMURL.text != ""){
			fnRetry("'object' == typeof(eTOC) && 'function' == typeof(eTOC.fnEnableHardwareSupportLink)", "eTOC.fnEnableHardwareSupportLink('" + fnValidateURL(oOEMURL.text) + "');", "", 1000, 4);
		}
	}

	oRoot.selectSingleNode("locale[@context = 'USER']/language").text = conLangCode;
	g_bAutoUpdateEnabled = (oRoot.selectSingleNode("computerSystem[@autoUpdateEnabled != '1']") == null);
	g_bOSIsServer = (oRoot.selectSingleNode("platform[productType = 'VER_NT_SERVER']") != null);

	eTOC.fnInitUserData();
	if(eTOC.g_oUserData != null) eTOC.fnEnableCatalogLink();

	g_sComputerSystemBlob = oRoot.selectSingleNode("computerSystem").xml   // we would insert this blob for all item/printer queries

	try{
		xmlCopyNode(oRoot, g_oCatalogXML);
	}catch(e){
		fnDisplayErrorPage(conErrorOther, true, UPDATE_ERROR_Q269688);
		return false;
	}

	if(g_bCorporate){
		eContent.location.replace(conCatalogURL + "initial.asp");
	}else if(conCriticalUpdatesMode){
		fnInitScan();
	}else{
		fnDisplaySplashPage(conSplashWelcome);
	}

	if(g_bSaveXML) top.fnSaveXML(oXML.xml, "SystemSpecXML");
	if(g_bSaveXML) top.fnSaveXML(CatalogXML.xml, "SystemSpecXML-CatalogXML");
	
	if("function" == typeof(fnInitWebIQ) && conLangCode == "en") window.setTimeout("fnInitWebIQ();", 0);
}

function fnSwitchSites(bCorporate){
	g_bCorporate = bCorporate;
	if(bCorporate){
		if("function" == typeof(fnInitDetect)){
			eContent.location.replace(conCatalogURL + "initial.asp");
		}else{
			fnLoadJS();
		}
	}else if(g_bDetectedItems){
		fnDisplayAvailableUpdates();
	}else{
		fnDisplaySplashPage(conSplashWelcome);
	}
}

function fnLoadJS(){
	top2.src = "/shared/js/top2.js";
}

function fnInitTopJS(){
	if(typeof(g_bCorporate) == "undefined") return false;

	if(!g_bCorporate){
		if(g_bScanning) fnInitDetect();
	}else{
		if(window.location.href.indexOf("/catalog/") == -1) eContent.location.replace(conCatalogURL + "initial.asp");
	}
}

/* init */
/* detection */

function fnScan(){
	fnRetry("'function' == typeof(eTOC.fnInitDetectUpdates) && 'function' == typeof(eTOC.fnEnableTOC) && g_oCatalogXML != null && g_oCatalogXML.selectSingleNode('systemInfo') != null", "if(!g_bScanning) fnInitScan();", "fnReloadSite();", 1000, 5);
}

function fnReloadSite(){
	if(window.confirm(L_ReloadingSiteText_Text)){
		fnScan();
	}else{
		window.location.reload();
	}
}

function fnInitScan(){
	var sOSID;

	g_bScanning = true;
	eTOC.fnInitDetectUpdates();

	if(eContent.g_iPage == conSplashPage && eContent.g_iSubPage == conSplashWelcome){
		eContent.eSplashWelcome.style.display = "none";
		eContent.eSplashScanning.style.display = "block";
	}else{
		fnDisplaySplashPage(conSplashScanning);
	}

	if("function" == typeof(fnInitDetect)){
		if(g_bDetectedItems){
			sOSID = g_oCatalogXML.selectSingleNode("provider/product[category = '" + conCategoryOS + "']/identity/@itemID").text;
			eTOC.document.all[sOSID].id = "eWindowsUpdates";

			eTOC.fnEnableLink(eTOC.eCriticalUpdates, false);
			eTOC.fnEnableLink(eTOC.eWindowsUpdates, false);
			eTOC.fnEnableLink(eTOC.eDriverUpdates, false);
			eTOC.fnEnableLink(eTOC.eBasketUpdates, false);
			xmlRemoveNodes(g_oCatalogXML, ["provider"]);
			fnClearSite();
		}

		window.setTimeout("fnInitDetect();", 0);
	}else{
		window.setTimeout("fnLoadJS();", 0);
	}
}

/* detection */
/* dialogs */

function fnShowReadMore()
{
    strUrl = event.srcElement.readMoreUrl;
    iTop = (document.body.clientHeight - 400)/2;
    iLeft = (document.body.clientWidth - 400)/2;
    window.open(strUrl, "_blank", "directories=no,width=400,height=400,left=" + iLeft + ",top=" + iTop + ",location=no,menubar=yes,status=no,toolbar=no,resizable=yes,scrollbars=yes");
    event.returnValue = false;
}

function fnDisplayDetails(sDetailsURL){
	var iTop, iLeft;

	if(g_bCorporate){
		if(g_oPopup) g_oPopup.close();
		g_oPopup = window.showModelessDialog(conCatalogURL + "itemdetails.asp?id=" + sDetailsURL, [window], "dialogWidth:505px;dialogHeight:345px;help:no;scroll:no;status:no;");
	}else{
		iTop = (document.body.clientHeight - 400)/2;
		iLeft = (document.body.clientWidth - 400)/2;
		window.open(sDetailsURL, "_blank", "directories=no,width=400,height=400,left=" + iLeft + ",top=" + iTop + ",location=no,menubar=yes,status=no,toolbar=no,resizable=yes,scrollbars=yes");
	}
}

/* dialogs */
/* display content */

function fnDisplayErrorPage(iError, bDisableTOC, sErrorDetails){
	try{
		if(bDisableTOC) eTOC.fnDisableTOC(iError, sErrorDetails);
		sErrorDetails = (sErrorDetails == null) ? "" : "&details=" + sErrorDetails;
		eContent.location.replace(conConsumerURL + "error.asp?error=" + iError + sErrorDetails + "&corporate=" + g_bCorporate + "&" + conQueryString);
	}catch(e){}
}

function fnDisplaySplashPage(iPage){
	g_iSplashPage = iPage;
	//changed for AMD64
	eContent.location.replace(conConsumerURL + "splash.asp?page=" + iPage + "&auenabled=" + g_bAutoUpdateEnabled + "&" + conQueryString);
}

function fnDisplayAvailableUpdates(){
	fnScan();
}

function fnDisplayHistory(bCorporate){
	if(bCorporate == null) bCorporate = false;

	g_bCorporate = bCorporate;
	eContent.location.href = conConsumerURL + "history.asp?corporate=" + g_bCorporate + "&" + conQueryString;
}

function fnDisplayLearnAbout(iTopic){
	if(g_oPopup != null) g_oPopup.close();
	g_oPopup = window.showModelessDialog(conConsumerURL + "dialog_learnabout.asp?topic=" + iTopic + "&" + conQueryString, [window], "scroll:no;help:no;status:no;resizable:no;dialogWidth:385px;dialogHeight:440px");
}

function fnDisplayBasketUpdates(bCorporate){
	if(bCorporate == null) bCorporate = false;

	var vUpdates, sXML, aAttributes, aElements;

	g_bCorporate = bCorporate;

	if(g_bCorporate){
		sXML = eTOC.os_sBasket + "|@|" + eTOC.driver_sBasket + "|@|" + eTOC.software_sBasket;
		fnPostData(sXML, conCatalogURL + "downloadbasket.asp?speed=" + g_iConnectionSpeed + "&" + conQueryString);
	}else{
		vUpdates = g_oCatalogXML.selectNodes("provider/product/group/item[@basket][not(@hidden)]");

		sXML = "<catalog>\n";
		if(vUpdates.length > 0){
			aAttributes = ["downloaded", "detected", "driver", "errorCode"];
			aElements = ["identity", "title", "size", "details", "exclusive", "dependencies"];
			sXML += fnGetItemXML(vUpdates, aAttributes, aElements, false, true);
		}
		sXML += "</catalog>";

		fnPostData(sXML, conConsumerURL + "results.asp?id=basket&localesettings=" + g_sRegionalSettings + "&speed=" + g_iConnectionSpeed + "&" + conQueryString);
	}
}

function fnDisplayPersonalization(){
	fnPostData("<catalog />", conConsumerURL + "personalize.asp?" + conQueryString);
}

/* display content */
/* control init */

function fnInitializeControl(bAttemptedInstall){
	if(bAttemptedInstall == null) bAttemptedInstall = false;

	var dDate, sCodeBase, iInitReturn;

	try{
		if(g_oControl == null){
			dDate = new Date();
			sCodeBase = "/CAB/" + (g_bX86 ? "x86/" : "ia64/") + (conWinNT ? "unicode/" : "ansi/") + "iuctl.CAB?" + dDate.getTime();
			IUCtl.outerHTML = "<object id='IUCtl' classid='CLSID:9F1C11AA-197B-4942-BA54-47A8489BB47F' codebase='" + sCodeBase + "'></object>";
			g_oControl = IUCtl;
		}
		iInitReturn = g_oControl.Initialize(IU_INIT_CHECK, window);
	}catch(e){
		if(e.number == ERROR_INVALID_PROPERTY){
			fnDisplayErrorPage(conErrorNotAdmin, true);
		}else{
			fnHandleControlError(e.number, bAttemptedInstall);
		}
		return false;
	}

	if(iInitReturn == IU_UPDATE_OK){
		return fnTestControl();
	}else if(iInitReturn == IU_UPDATE_CONTROL_BIT || iInitReturn == IU_UPDATE_CONTROL_AND_ENGINE_BIT){
		g_oControl = null;
		fnDisplayErrorPage(conErrorOldControl, true);
		return false;
	}else if(iInitReturn == IU_UPDATE_ENGINE_BIT){
		g_oControl = IUCtl;
		fnDisplayErrorPage(conErrorOldEngine, true);
		return false;
	}else{
		fnHandleControlError(iInitReturn);
		return false;
	}
}

function fnTestControl(){
	var sSystemSpecXML;

	try{
		sSystemSpecXML = g_oControl.GetSystemSpec("<classes><locale /></classes>");
	}catch(e){
		fnHandleControlError(e.number);
		return false;
	}

	g_bControlInitialized = true;
	eTOC.fnEnableTOC();
	fnCreateCatalogXML();
	return true;
}

function fnHandleControlError(iError, bAttemptedInstall, bCriticalControlError){ 
	if(bAttemptedInstall == null) bAttemptedInstall = false;
	if(bCriticalControlError == null) bCriticalControlError = true;

	if(bCriticalControlError) g_oControl = null;
	
	if(iError == Error_XmlDom_Reason1 ||iError == Error_XmlDom_Reason2 || iError == Error_XmlDom_Reason3 || iError == Error_XmlDom_Reason4){
		fnDisplayErrorPage(conErrorXmlDom, true,iError);		
	}else if(iError == UPDATE_ERROR_ACCESS_DENIED){
		fnDisplayErrorPage(conErrorNotAdmin, true);
	}else if(iError == HTTP_STATUS_LENGTH_REQUIRED || iError == HTTP_STATUS_PROXY_AUTH_REQ){
		fnDisplayErrorPage(conErrorProxy, true);
	}else if(iError == ERROR_INTERNET_NAME_NOT_RESOLVED || iError == ERROR_INTERNET_CANNOT_CONNECT || iError == ERROR_INTERNET_CONNECTION_RESET || iError == HTTP_STATUS_GATEWAY_TIMEOUT || iError == HTTP_ERROR_502){
		fnDisplayErrorPage(conErrorNetwork, true);
	}else if(iError == WIN32_PATH_NOT_FOUND || iError == WIN32_INVALID_URL){
		fnDisplayErrorPage(conErrorServer, true);
	}else if(iError == WIN32_CANNOT_DOWNLOAD){
			if (g_sLang == "") fnDisplayErrorPage(conErrorNoIELang, true,iError);
			else fnDisplayErrorPage(conErrorSystemTimeOff, true,iError);
	}else if(iError == WIN32_ERROR_SERVICE_DISABLED){
		fnDisplayErrorPage(conErrorDisabled, true);
	}else if(bAttemptedInstall || iError == WIN32_SUBJECT_NOT_TRUSTED || iError == WIN32_ERROR_NETWORK_ACCESS_DENIED || iError == WIN32_ERROR_ACCESS_DENIED || iError == WIN32_ERROR_ACCESS_DENIED2){
		fnDisplayErrorPage(conErrorControlUpdateFailed, true, iError);
	}else if(bCriticalControlError){
		fnDisplayErrorPage(conErrorControlFailed, true, iError);
	}
}

function fnUpdateControl(){
	fnDisplaySplashPage(conSplashInstallingControl);
}

function fnUpdateEngine(){
	fnDisplaySplashPage(conSplashInstallingEngine);
}

/* control init */
/* control functions */

function control_GetHistory(sDateTimeFrom, sDateTimeTo, sClient, sPath){
	return fnCallControlMethod("GetHistory('" + sDateTimeFrom + "','" + sDateTimeTo + "','" + sClient + "','" + sPath + "')", false);
}

function control_GetSystemSpec(sXmlClasses){
	return fnCallControlMethod("GetSystemSpec('" + sXmlClasses + "')");
}

function control_SetOperationMode(sUuidOperationID, lCommand){
	return fnCallControlMethod("SetOperationMode('" + sUuidOperationID + "'," + lCommand + ")", false);
}

function control_OnComplete(lErrorCode){
	if(lErrorCode == IU_UPDATE_OK){
		fnInitializeControl(true);
	}else{
		fnHandleControlError(lErrorCode, true);
	}
}

function fnCallControlMethod(sMethod, bValidateXML){
	if(bValidateXML == null) bValidateXML = true;

	var sReturnValue, oXML;

	if(g_bSaveXML) top.fnSaveXML("<method>" + sMethod + "</method>", "Method-" + sMethod.substring(0, sMethod.indexOf("(")) + "()");

	sMethod = fnEscapeString(sMethod);

	try{
		g_bDriversFailed = false ;
		sReturnValue = eval("g_oControl." + sMethod);

	}catch(e){

		// Bug 3976, 3991 Handle BrowserForFolder error messages a bit differently and for the following errors dont redirect to error.asp
		if (0 == sMethod.indexOf("BrowseForFolder")){
			switch (e.number){
				case WIN32_ERROR_CANCELLED:
				case ERROR_FILE_NOT_FOUND:
				case ERROR_PATH_NOT_FOUND:
				case ERROR_CANNOT_MAKE:
				case ERROR_WRITE_PROTECT:
				case ERROR_WRITE_FAULT:
				case ERROR_E_FAIL:
					return false;		// the page calling this function displays the appropriate error.
					break;
				default:
					// continue as normal
			}
		}
		
		if (sMethod.indexOf("procedure=\\\"DriverUpdates\\\"") != -1){ // this is to sort out the getmanifest call for drivers query
			g_bDriversFailed = true ; 
			return false;
		}
		
		fnHandleControlError(e.number);
		if(g_bSaveXML) top.fnLogError("Control method failed.", sMethod, e.number + ": " + e.description);
		return false;
	}

	if(bValidateXML){
		oXML = xmlNewXML();
		oXML.loadXML(sReturnValue);
		if(oXML.parseError != 0){
			fnHandleControlError(oXML.parseError, null, false);
			if(g_bSaveXML) top.fnLogError("Control returned invalid XML.", sMethod, xmlParseError(oXML.parseError));
			return false;
		}
	}

	return sReturnValue;
}

/* control functions */
/* iu functions */

function fnEscapeString(s){
	s = s.replace(/\\/g, "\\\\");
	s = s.replace(/tempquote/g, "\\\'");
	s = s.replace(/\"/g, "\\\"");
	s = s.replace(/\n|\r/g, "");
	return s;
}

function fnPostData(sData, sURL){
	var oPostForm;

	oPostForm = eTOC.ePostForm;
	oPostForm.ePostData.value = sData;
	oPostForm.action = sURL;
	oPostForm.submit();
	g_bPosted = true;
}

/* iu functions */
/* general functions */

function fnRetry(sTry, sIfSuccess, sIfFailure, iPause, iMaxRetries, iTries){
	if(iTries == null) iTries = 0;

	if(eval(sTry)){
		eval(sIfSuccess);
	}else if(iTries < iMaxRetries){
		window.setTimeout("fnRetry(\"" + sTry + "\", \"" + sIfSuccess + "\", \"" + sIfFailure + "\", " + iPause + ", " + iMaxRetries + ", " + ++iTries + ");", iPause);
	}else{
		eval(sIfFailure);
	}
}

function fnValidateURL(sURL){
	if(sURL.match(/^(ftp|http|https):\/\//i) == null) sURL = "http://" + sURL;
	return sURL;
}

/* general functions */
/* xml functions */

function xmlNewXML(bValidateOnParse, bResolveExternals, bPreserveWhiteSpace, bAsync){
	if(bValidateOnParse == null) bValidateOnParse = false;
	if(bResolveExternals == null) bResolveExternals = false;
	if(bPreserveWhiteSpace == null) bPreserveWhiteSpace = false;
	if(bAsync == null) bAsync = false;

	var oXML;

	oXML = new ActiveXObject("Microsoft.XMLDOM");
	oXML.validateOnParse = bValidateOnParse;
	oXML.resolveExternals = bResolveExternals;
	oXML.preserveWhiteSpace = bPreserveWhiteSpace;
	oXML.async = bAsync;
	return oXML;
}

function xmlCopyNode(oNode, oTargetNode, bCopyChildren, bMove){
	if(bCopyChildren == null) bCopyChildren = true;
	if(bMove == null) bMove = false;
	oTargetNode.appendChild(oNode.cloneNode(bCopyChildren));
	if(bMove) oNode.parentNode.removeChild(oNode);
}

/* xml functions */
