var conGrowing = -1;
var conShrinking = 1;

var g_iPage, g_iSubPage, g_iTotalBasketSize, g_iTotalBasketCount, g_iMoveTimer, g_iMoveStage;
var g_oOldDependencyPopupLink, g_oMoveObj, g_oMoveObjStyle;
var g_sMoveTimerVariables;

function fnInit(iPage, iSubPage){
	document.ondragstart = new Function("return false;");
	document.oncontextmenu = new Function("return false;");

	if(!parent.g_bControlInitialized) return false;

	if(parent.document.readyState != "complete" || parent.eTOC.document.readyState != "complete"){
		window.setTimeout("fnInit(" + iPage + ", " + iSubPage + ");", 100);
		return false;
	}

	g_iPage = iPage;
	g_iSubPage = iSubPage;

	if(self != top){
		if("function" == typeof(parent.eTOC.fnSyncTOC)) parent.eTOC.fnSyncTOC(self.location.href, g_iPage, g_iSubPage);
		if("function" == typeof(parent.fnLoadImages)) parent.fnLoadImages();
	}

	if(parent.conBrowserVersion < 5.5) document.styleSheets[0].addRule("button", "width: auto !important;height: auto !important;");
	if (g_iPage == parent.conSplashPage && g_iSubPage == parent.conSplashWelcome)  document.all("newsframe").src = "news.asp?ln=" + parent.conLangCode  ;
	
}

function fnInitSplashPage(iPage, iSubPage){ // called onload of splash page
	var iInitReturn;

	if(self == top || iSubPage != parent.conSplashCheckingControl && iSubPage != parent.conSplashInstallingControl && iSubPage != parent.conSplashInstallingEngine && !parent.g_bControlInitialized) return false;
	if(parent.document.readyState != "complete" || parent.eTOC.document.readyState != "complete"){ //wait till the top.js and toc.js is loaded
		window.setTimeout("fnInitSplashPage(" + iPage + ", " + iSubPage + ");", 100);
		return false;
	}

	if(iSubPage == parent.conSplashPickUpdatesCritical || iSubPage == parent.conSplashPickUpdatesCriticalAndOther){
		eCriticalUpdates.innerText = parent.g_oCatalogXML.selectNodes("provider/product/group/item[priority <= '3']").length;
	}else if(iSubPage == parent.conSplashCheckingControl || iSubPage == parent.conSplashInstallingControl){
		return parent.fnInitializeControl(iSubPage == parent.conSplashInstallingControl);
	}else if(iSubPage == parent.conSplashInstallingEngine){
		try{
			iInitReturn = parent.g_oControl.Initialize(parent.IU_INIT_CHECK, parent);
			iInitReturn = parent.g_oControl.Initialize(parent.IU_INIT_UPDATE_ASYNC, parent);
		}catch(e){
			parent.fnHandleControlError(e.number, true);
			return false;
		}
		return true;
	}
	
	
	if(parent.g_bDriversFailed == true && iSubPage == parent.conSplashPickUpdatesCriticalAndOther) document.body.innerHTML += "<br>" + parent.L_SplashPickUpdatesCriticalText4_Text + "<br><br>" + parent.L_ErrorSupport_Text ;
	fnInit(iPage, iSubPage);
}

function fnInitResults(iPage, iSubPage){
	if(self == top || parent.document.readyState != "complete" || !parent.g_bControlInitialized) return false;

	if(!parent.g_bPosted){
		if(iSubPage == parent.conBasketPage){
			parent.fnDisplayBasketUpdates();
			return false;
		}

		fnUpdateButtonStates(); /*- UPDATE!!!! -*/
	}

	g_iPage = iPage;
	g_iSubPage = iSubPage;

	if(iSubPage == parent.conResultsBasket && "function" == typeof(parent.fnGetDependencies)){
		window.setTimeout("parent.fnGetDependencies();fnUpdateBasketStats();", 0);
	}else{
		fnUpdateBasketStats();
	}

	eUpdatesContainer.onscroll = fnEndMove;
	parent.g_bPosted = false;
	
	fnInit(iPage, iSubPage);
}

function fnInitWorldwide(iPage, iSubPage){
	var conCols = 3;
	var oDoc, oTD, oUL, oLI, oA, iLangsPerCell, iRemainderLangs, aLang, iStart, iEnd, i, j;

	oDoc = document;
	iLangsPerCell = Math.floor(g_aWorldwideLangs.length/conCols);
	iRemainderLangs = g_aWorldwideLangs.length%conCols;
	iEnd = 0;

	for(i = 0; i < conCols; i++){
		oTD = oDoc.createElement("td");
		eWorldwide.appendChild(oTD);
		oUL = oDoc.createElement("ul");
		oTD.appendChild(oUL);

		iStart = iEnd;
		iEnd += iLangsPerCell;
		if(i < iRemainderLangs) iEnd++;

		for(j = iStart; j < iEnd; j++){
			aLang = g_aWorldwideLangs[j].split("|@|");
			oLI = oDoc.createElement("li");
			oA = oDoc.createElement("a");
			oA.href = "/" + aLang[1] + "/default.asp";
			oA.className = "sys-link-normal";
			oA.innerText = aLang[0];
			oUL.appendChild(oLI);
			oLI.appendChild(oA);
		}
	}

	fnInit(iPage, iSubPage);
}

/* GLOBAL */
/* results.asp */

function fnUpdateBasketStats(){
	if(parent.g_bDetectedItems && g_iSubPage == parent.conResultsBasket){
		eBasketStats.innerHTML = g_iTotalBasketCount + " = " + parent.fnGetDownloadSizeText(g_iTotalBasketSize);
		eBasketCalculating.innerText = (g_iTotalBasketCount > parent.g_iConsumerBasketCount) ? parent.L_DependenciesTotal_Text : parent.L_Total_Text;
		eInstallLink.disabled = (g_iTotalBasketCount == 0);
	}else{
		eBasketStats.innerText = (parent.g_iConsumerBasketCount > 0) ? "(" + parent.g_iConsumerBasketCount + ")" : "(0)";
	}
}

function fnUpdateButtonStates(){
	var vDivs, iDivsLen, oDiv, sUpdateID, bInBasket, vButtons, i;

	vDivs = document.all.tags("div");
	iDivsLen = vDivs.length;

	for(i = 0; i < iDivsLen; i++){
		oDiv = vDivs[i];
		if(oDiv.className != "update" && oDiv.className != "updateDisabled") continue;
		sUpdateID = oDiv.id;
		bInBasket = (parent.g_oCatalogXML.selectSingleNode("provider/product/group/item[identity/@itemID = '" + sUpdateID + "']/@basket") != null);
		vButtons = oDiv.lastChild.children;

		if(g_iSubPage == parent.conResultsBasket){
			if(!bInBasket){
				oDiv.removeNode(true);
				iDivsLen -= 2;
			}
		}else{
			oDiv.className = bInBasket ? "updateDisabled" : "update";

			vButtons[0].style.visibility = bInBasket ? "visible" : "hidden";
			vButtons[1].disabled = bInBasket;
			vButtons[2].disabled = !bInBasket;
		}
	}
}

/* ----DIV MOVING---- */

function fnMoveObject(oObj, iStep, iStage){
	var iStartLeft, iStartTop, iStartWidth, iStartHeight, iSteps;
	var iFinishLeft, iFinishTop, iFinishWidth, iFinishHeight;
	var oDocBody, iTop, iLeft, iWidth, iHeight;
	var oSourceObject, iSourceObjectTop, iSourceObjectLeft, oMoveObj;
	var iLeftDistance, iTopDistance, iWidthDistance, iHeightDistance, iLeftInc, iTopInc, iWidthInc, iHeightInc;
	var dStartTime, dEndTime, iLag;

	if("object" == typeof(eMoveObj)) fnEndMove(true);

	dStartTime = new Date();
	oDocBody = document.body;
	g_iMoveStage = iStage;

	try{
		iTop = fnGetDistance(oObj, true) - oObj.parentElement.scrollTop;
		iLeft = fnGetDistance(oObj, false);
		iWidth = oObj.offsetWidth;
		iHeight = oObj.offsetHeight;

		oMoveObj = oObj.cloneNode(true);
		oDocBody.insertBefore(oMoveObj);
		oMoveObj.id = "eMoveObj";
		oMoveObj.className = "update";

		g_oMoveObj = oObj;
	}catch(e){
		return false;
	}

	oSourceObject = eBasketStats;
	iSourceObjectTop = fnGetDistance(oSourceObject, true) + parseInt(oSourceObject.offsetHeight/2);
	iSourceObjectLeft = fnGetDistance(oSourceObject, false) + parseInt(oSourceObject.offsetWidth/2);

	if(iStep == conShrinking){
		iStartTop = iTop;
		iStartLeft = !parent.conRTL ? iLeft : oDocBody.offsetWidth - iWidth - 10;
		iStartWidth = iWidth + 2;
		iStartHeight = iHeight + 1;

		iFinishTop = (iStage == parent.conBasketPage) ? fnGetDistance(parent.eTOC.document.all[oObj.productid], true) : iSourceObjectTop;
		iFinishLeft = (iStage == parent.conBasketPage) ? 0 : iSourceObjectLeft;
		iFinishWidth = 0;
		iFinishHeight = 0;
	}else{
		iStartTop = iSourceObjectTop;
		iStartLeft = iSourceObjectLeft;
		iStartWidth = 0;
		iStartHeight = 0;

		iFinishTop = iTop;
		iFinishLeft = !parent.conRTL ? iLeft : oDocBody.offsetWidth - iWidth - 10;
		iFinishWidth = iWidth;
		iFinishHeight = iHeight;
	}

	iTopDistance = iFinishTop - iStartTop;
	iLeftDistance = iFinishLeft - iStartLeft;
	iWidthDistance = iFinishWidth - iStartWidth;
	iHeightDistance = iFinishHeight - iStartHeight;

	dEndTime = new Date();
	iLag = 350 - (dEndTime - dStartTime);
	if(iLag < 0) iLag = 0;
	iSteps = parseInt(iLag/30) + 3;
	iSpeed = parseInt((iLag - 50)/10);
	if(iSpeed < 0) iSpeed = 0;

	iTopInc = parseInt(iTopDistance/iSteps);
	iLeftInc = parseInt(iLeftDistance/iSteps);
	iWidthInc = parseInt(iWidthDistance/iSteps);
	iHeightInc = parseInt(iHeightDistance/iSteps);

	// make up for remainder pixels \\
	if(iStep = conShrinking){
		iStartTop += (iTopDistance % iSteps);
		iStartLeft += (iLeftDistance % iSteps);
		iStartWidth += (iWidthDistance % iSteps) + 2;
		iStartHeight += (iHeightDistance % iSteps);
	}

	if(iStartHeight == 0) iStartHeight = 1; /* IE5.5 BUG */

	// set initial position \\
	g_oMoveObjStyle = eMoveObj.style;
	g_oMoveObjStyle.top = iStartTop;
	g_oMoveObjStyle.left = iStartLeft;
	g_oMoveObjStyle.width = iStartWidth;
	g_oMoveObjStyle.height = iStartHeight;

	g_sMoveTimerVariables = ", " + iWidthInc + ", " + iHeightInc + ", " + iLeftInc + ", " + iTopInc + ", " + iSteps + ", " + iSpeed;
	g_iMoveTimer = window.setTimeout("fnMove(" + 0 + g_sMoveTimerVariables + ");", 0);
}

function fnMove(i, iWidthInc, iHeightInc, iLeftInc, iTopInc, iMax, iSpeed){
	try{
		g_oMoveObjStyle.posWidth += iWidthInc;
		g_oMoveObjStyle.posHeight += iHeightInc;
		g_oMoveObjStyle.posLeft += iLeftInc;
		g_oMoveObjStyle.posTop += iTopInc;
		if(g_oMoveObjStyle.posHeight == 0) g_oMoveObjStyle.posHeight = -1; /* IE5.5 BUG */

		if(++i < iMax){
			g_iMoveTimer = window.setTimeout("fnMove(" + i + g_sMoveTimerVariables + ");", iSpeed);
		}else{
			window.setTimeout("fnEndMove();", 0);
		}
	}catch(e){}
}

function fnEndMove(bInterrupted){
	if(bInterrupted == null) bInterrupted = false;

	var sProductID, sItemID, oLink, oNode, iSize;

	window.clearTimeout(g_iMoveTimer);
	if("object" != typeof(eMoveObj)) return false;
	eMoveObj.removeNode(true);

	if(g_iMoveStage == parent.conAddedUpdate){
		sItemID = g_oMoveObj.id;
		parent.fnAddItem(sItemID);
		fnUpdateBasketStats();

		if(g_oMoveObj.downloaded == "1") g_oMoveObj.getElementsByTagName("span")[0].innerHTML = parent.L_AlreadyDownloadedAddedText_Text;

		if(g_oMoveObj.exclusive == "1"){
			if(!bInterrupted) fnUpdateButtonStates();
		}else{
			g_oMoveObj.className = "updateDisabled";
			g_oMoveObj.lastChild.firstChild.style.visibility = "visible";
		}
	}else if(g_iMoveStage == parent.conBasketPage){
		if(parent.g_iConsumerBasketCount == 1){
			eSubTitle.style.display = "none";
			eSubTitleNoUpdates.style.display = "block";
			ePageDesc.style.display = "none";
			ePageDescNormal.style.display = "none";
			ePageDescCanceledEULA.style.display = "none";
			ePageDescNoUpdates.style.display = "inline";
			eNoUpdatesAvailable.style.display = "inline";
		}else if(g_oMoveObj.exclusive == "1"){
			ePageDesc.style.display = "none";
			ePageDescNormal.style.display = "inline";
		}

		sProductID = g_oMoveObj.productid;
		sItemID = g_oMoveObj.id;
		g_oMoveObj.removeNode(true);

		parent.fnRemoveItem(sItemID);

		oLink = parent.eTOC.document.all[sProductID];
		oLink.className = "sys-link-normal sys-toppane-selection";
		parent.eTOC.setTimeout("document.all['" + sProductID + "'].className = 'sys-link-normal';", 450);

		if(parent.g_oCatalogXML.selectSingleNode("provider/product/group/item[identity/@itemID = '" + sItemID + "']/dependencies") != null || parent.g_oCatalogXML.selectSingleNode("provider/product/group/item/dependencies[identity/@itemID = '" + sItemID + "']") != null){
			if(!bInterrupted) parent.fnGetDependencies();
		}else{
			oNode = parent.g_oCatalogXML.selectSingleNode("provider/product/group/item[identity/@itemID = '" + sItemID + "']");
			iSize = parseInt(oNode.selectSingleNode("size").text);
			g_iTotalBasketCount--;
			g_iTotalBasketSize -= iSize;
		}

		if(!bInterrupted) fnUpdateBasketStats();
	}
}

/* ----DIV MOVING---- */
/* results.asp */

/* general functions */

function fnCancel(){
	if(window.event) window.event.cancelBubble = true;
}

function fnGetDistance(oFromObj, bFromTop){
	var bFromTop, i;

	oParent = document.body;
	i = 0;

	try{
		while(oFromObj != oParent){
			i += bFromTop ? oFromObj.offsetTop : oFromObj.offsetLeft;
			oFromObj = oFromObj.offsetParent;
		}
	}catch(e){}

	return Math.abs(i);
}

/* general functions */