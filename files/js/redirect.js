//*********************************************************************************
// Copyright (c) Microsoft Corporation.  All rights reserved.
//
// File Name   : Redirect.js
// Description : Redirection logic for determining best URL for client.
//
// Revisions   : alias      date        description
//               pcupp      2006-12-19  updated with wuweb.dll based version check
//               pcupp      2006-12-30  added comments and consistent return value
//                                      also added Vista lang support
//               pcupp      2007-06-04  split client environment variable detection
//                                      and redirection for testability
//               pcupp      2007-07-10  added isSufficient check to prevent XmlHttp
//                                      requests when browser or OS is unsupported
//               pcupp      2007-08-23  removed unecessary constants, changed lang
//                                      check to work with firefox.
//*********************************************************************************

// OS types
var conOSUnsupported = "-1";
var conOSWin2K = "5.0";
var conOSWinXP = "5.1";
var conOSWin2003 = "5.2";
var conOSVista = "6.0";
var conOSWin7 = "6.1";
var conOSWin8 = "6.2";
var conOSWinBlue = "6.3";
var conOSWin10 = "10.0";

// Thanks page codes
var conThanksDown = 1;
var conThanksBadOS = 2;
var conThanksWinCE = 3;
var conThanksDatacenter = 4;
var conThanksBadBrowser = 5;
var conThanksIE5 = 8;
var conThanksLocale = 9;
var conThanks64BitBrowser = 10;

// URLs and related constants, keep these lower case to ensure
// comparisons below are done correctly.
var V3Site = "http://windowsupdate.microsoft.com"
var V4Site = "http://v4.windowsupdate.microsoft.com";
var V5Site = "http://v5.windowsupdate.microsoft.com";
var V6Site = "http://www.update.microsoft.com/windowsupdate";
var V7Cat = "http://go.microsoft.com/fwlink/?LinkID=96155";
var WinBlueFWLink = "http://go.microsoft.com/fwlink/?LinkId=321527";    // Using this name so that it's easily searchable.

// V6Site cursite value should be 6Live
var conCurSite = "6Live";
var conRedrThanks = V6Site + "/v6/" + "thanks.aspx?" ;

//=================================================================================
// Environmental assessment
//=================================================================================

// Keeping globals around to preserve legacy behaviors outside redirection scope
var g_iOSType;
var g_iOSSPMajor;
var g_sOSLang;
var g_sUA;
var g_bMUOptin;

/// <summary>
///     Class to determine the state of the client environment,
///     which is used by the redirection function to determine the 
///     appropriate URL for the user.
/// </summary>
function ClientEnvironment()
{   
    // Capture global variable values
    if(typeof(curSite) != typeof(window.undefined))
        this.currentSite = curSite;
    
    if(typeof(g_bMUSite) != typeof(window.undefined))
        this.isCurrentSiteMU = g_bMUSite;

    if(typeof(g_sDownForMaintenance2K) != typeof(window.undefined))
        this.isDownForMaintenance2K = g_sDownForMaintenance2K.length > 0;
    if(typeof(g_sDownForMaintenanceXP) != typeof(window.undefined))
        this.isDownForMaintenanceXP = g_sDownForMaintenanceXP.length > 0;
    if(typeof(g_sDownForMaintenance2003) != typeof(window.undefined))
        this.isDownForMaintenance2003 = g_sDownForMaintenance2003.length > 0;
    if(typeof(g_sDownForMaintenanceLonghorn) != typeof(window.undefined))
        this.isDownForMaintenanceLonghorn = g_sDownForMaintenanceLonghorn.length > 0;
    
    // Save the current URL
    this.currentUrl = window.location.href.toLowerCase();
    
    // Check protocol so it can be preserved prior to redirecting
    this.isHttps = this.currentUrl.substr(0,6) == 'https:';

    // Get raw userAgent string and store it
    this.rawUserAgent = navigator.userAgent.toLowerCase();
    
    // Call a helper function to determine a normalized user agent string
    this.userAgent = this._getUserAgent();
    g_sUA = this.userAgent;
    
    // Call a helper function to determine the OS
    this.os = this._getOS(this.userAgent);
    g_iOSType = this.os;
    
    // Call a helper function to determine the language to display the site in
    this.langID = this._getLangID(navigator.browserLanguage ? navigator.browserLanguage : navigator.language, (this.os == conOSVista || this.os == conOSWin7 || this.os == conOSWin8 || this.os == conOSWinBlue || this.os.conOSWin10));
    g_sOSLang = this.langID;
    
    // Get cpuClass directly from the navigator object
    if(navigator.cpuClass)
        this.cpuClass = navigator.cpuClass.toLowerCase();
    else
        this.cpuClass = "";
        
    if((this.cpuClass == "x86") && (this.userAgent.indexOf("wow") > 0)) this.cpuClass = "wow64";
    
    // Default properties determined by the client to an undefined state
    // just declaring them below to make the ClientEnvironment contract 
    // with the Redirector class clear.
    this.isManaged = window.undefined;
    this.isOptedIntoMU = window.undefined;
    this.servicePack = window.undefined;
    this.clientVersion = window.undefined;
    this.serviceUrl = window.undefined;
    this.isControlCreatable = true;
    
    // Initialize the values above by calling the helper function below
    this._detectClientInfo(this.os);
    
    g_bMUOptin = this.isOptedIntoMU;
    g_iOSSPMajor = this.servicePack;
}

ClientEnvironment.prototype = {
    /// <summary>
    ///     Determines the user agent string for evaluating redirection.
    /// </summary>
    _getUserAgent: function()
    {
        var userAgent = "";
        try
        {
            userAgent = navigator.userAgent.toLowerCase();
            
            // make a request to the server to allow any fixup
            // of the navigator's UA string
            var xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
            xmlHttp.open("POST", "redirect.asp?UA=true", false);
            xmlHttp.send("<send></send>");
            
            // read the response which has been delimited on the server by @|
            var responseXml = xmlHttp.responseText;
            var responseXmlParts = responseXml.split("@|");
            
            if(responseXmlParts.length > 1) {		
                userAgent = getSafeResponse(responseXmlParts[1].toLowerCase());
            } 
        }
        catch(e)
        {
            // fail silently, we can make redirection decisions
            // if we run into problems obtaining this data
        }
        
        return userAgent;
    },
    
    /// <summary>
    ///     Determine the OS.
    /// </summary>
    /// <returns>
    ///     One of conOSWin2K, conOSWinXP, conOSWin2003, conOSVista, conOSWin7, conOSWin8, conOSWinBlue, consOSWin10
    ///     or conOSUnsupported according to the detected OS.
    /// </returns>
    ///     Checks are based off of the contents of the user agent string.
    /// </remarks>
    _getOS: function(userAgent)
    {
        // Default to unsupported
        var os = conOSUnsupported;
        
        // Check the UA to see what OS the user is running
        if(userAgent.indexOf("windows nt 5.0") > 0) os = conOSWin2K;
        else if(userAgent.indexOf("windows nt 5.1") > 0) os = conOSWinXP;
        else if(userAgent.indexOf("windows nt 5.2") > 0) os = conOSWin2003;
        else if(userAgent.indexOf("windows nt 6.0") > 0) os = conOSVista;
        else if(userAgent.indexOf("windows nt 6.1") > 0) os = conOSWin7;
	else if(userAgent.indexOf("windows nt 6.2") > 0) os = conOSWin8;
	else if (userAgent.indexOf("windows nt 6.3") > 0) os = conOSWinBlue;
    else if (userAgent.indexOf("windows nt 10.0") > 0) os = conOSWin10;
        
        return os;
    },
    
    /// <summary>
    ///     Given a preferred language ID translate it to a supported language ID.
    /// </summary>
    /// <returns>
    ///     A supported language ID.
    /// </returns>
    _getLangID: function(langID, isVista)
    {
        // Normalize the langID string
        if(typeof(langID) == "undefined" || langID == null) 
        {
            langID = "en";
        }
        langID = langID.toLowerCase();
        
        var allSupportedLangs;
        // Vista and down-level OS's have different language support
        if(isVista)
        {
            allSupportedLangs = "ar,cs,da,el,en,nl,fi,fr,de,he,hu,it,ja,ko,no,pl,ru,es,sv,tr,bg,hr,et,lv,lt,ro,sk,sl,th,uk,sr,";
            
            // Switch on languages with a custom fallback
            switch(langID)
            {           
    	        case "be":
		        case "kk":
		        case "ky":
			        return "ru" ;
		        case "eu":
		        case "ca":
		        case "qut":
		        case "quz":
			        return "es" ;
		        case "zh-hk":
			        return "zh-tw" ;
		        case "zh-sg":
			        return "zh-cn" ;
		        case "fo":
			        return "da" ;
		        case "sz":
		        case "nn-no":
		        case "nb-no":
			        return "no" ;
		        case "sb":
			        return "de" ;
		        case "iw-il":
			        return "he" ;
		        case "el_ms":
			        return "el" ; 
		        case "lb":
			        return "fr";
		        case "tt":
		        case "uz-uz-latn":
			        return "ru";					
            }
        }
        else
        {
            allSupportedLangs = "ar,cs,da,de,el,en,es,fi,fr,he,hu,it,ja,ko,nl,no,pt,pl,ru,sv,tr,";
            
            // Switch on languages with a custom fallback
            switch(langID)
            {           
                case "be":
                case "uk":
                    return "ru" ;
                case "eu":
                case "ca":
                    return "es" ;
                case "zh-sg":
                    return "zh-cn" ;
                case "fo":
                    return "da" ;
                case "sz":
                    return "no" ;
                case "sk":
                    return "cs" ;
                case "sb":
                    return "de" ;
                case "nb-no":
                case "nn-no":
                    return "no" ;
                case "iw-il":
                    return "he" ;
            }
        }    
        
        // These are the only four region specific strings supported
        if((langID == "zh-tw") || (langID == "zh-cn") || (langID == "pt-br") || (langID == "zh-hk")) return langID;	
        
        // All other strings are truncated to language only
        langID = langID.substr(0,2);
        
        // Lastly if the language string is not among the supported list fallback to en
        if(allSupportedLangs.search(langID + ",") < 0 ) langID = "en";
        
        return langID;
    },
    
    _detectClientInfo: function(os)
    {
        // Control variables to be nulled prior to return
        var control = null;
        var serviceManager = null;
        var updateServices = null;
                
        // Get the proper WU control
        if(os == conOSVista || os == conOSWin7  || this.os == conOSWin8 || this.os == conOSWinBlue || this.os == conOSWin10){
            try{
                control = new ActiveXObject("SoftwareDistribution.VistaWebControl");	
            }
            catch(e) {
                this.isControlCreatable = false;
            }
        }
        else
        {
            try {				
                // WU control
                control = new ActiveXObject("SoftwareDistribution.WebControl");
            }
            catch(e) {
                // Keep going
                this.isControlCreatable = false;
            }
        }
        
        try
        {
            // If control is present get SP level, control version, managed and opt-in settings
            if(control != null && typeof(control) == "object")
            {
                this.servicePack = control.GetOSVersionInfo(4,1);
                this.clientVersion = this._getAgentVersion(control);
                if(os == conOSVista || os == conOSWin7  || this.os == conOSWin8 || this.os == conOSWinBlue || this.os == conOSWin10)
                {
                    if(control.GetUpdateServiceOptInStatus("7971f918-a847-4430-9279-4a52d1efe18d") || control.GetUpdateServiceOptInStatus("273d61df-59ea-46c5-8ced-c94d6dade3d1"))
                        this.isOptedIntoMU = true;
                }
                else
                {
                    serviceManager = control.CreateObject("Microsoft.Update.ServiceManager");
                    updateServices = serviceManager.Services;
                    for (i = 0; i < updateServices.Count; i++) 
                    {
                        if((updateServices.Item(i).IsRegisteredWithAU) &&
                            (!updateServices.Item(i).IsManaged) && 
                                (updateServices.Item(i).ServiceId.toLowerCase() != "9482f4b4-e343-43b6-b170-9a65bc822c77")) 
                        {
                                this.isOptedIntoMU = true;
                                this.serviceUrl = updateServices.Item(i).ServiceUrl;
                                break;
                        }
                    }
                    for(i = 0; i < updateServices.Count; i++)
                    {
                        if (updateServices.Item(i).IsManaged) 
                        {
                            this.isManaged = true;
                            break;
                        }
                    }
                }
            }	
        } 
        catch(e)
        { 
            // If there are control problems then omit those
            // parameters from the request to redirect.asp
            // but don't stop, hence the empty catch block.
        }
        
        // Null control references to manage COM refernce count
        control = null;
        updateServices = null;
        serviceManager = null;
        
        // Null any global reference as well to preserve legacy behavior
        if(typeof(g_oControl) != typeof(window.undefined))
            g_oControl = null;
    },
    
    /// <summary>
    ///     Gets the version (as a string) of the Windows Update agent or
    ///     the version of the ActiveX control if that isn't available.
    ///     Will return the empty string if neither can be obtained.
    /// </summary>
    _getAgentVersion: function(control)
    {
        var versionForRedirection = "";
        var agentInfo;

        if(typeof(control) != "undefined" && control != null)
        {
            try
            {
                // Check AgentInfo for agent version first
                agentInfo = control.CreateObject("Microsoft.Update.AgentInfo");
                var agentVersion = agentInfo.GetInfo("ProductVersionString");
                var controlVersion = control.GetOSVersionInfo(10, 0);
                
                versionForRedirection = this._getMaxVersion(agentVersion, controlVersion);
            }
            catch(e)
            {
                try
                {
                    // Get version the old way
                    versionForRedirection = control.GetOSVersionInfo(10, 0);
                }
                catch(ignore)
                {
                    // Continue with no version info (parity behavior)
                }
            }   
            
            // Try to ensure the control is unloaded by IE to accomodate
            // self-update scenarios
            agentInfo = null;
        }
        
        return versionForRedirection;
    },
    
    /// <summary>
    ///     Gets the greater of the two version strings.  Null version
    ///     strings are treated as zero.
    /// </summary>
    _getMaxVersion: function(version1, version2)
    {
        var maxVersion;
        
        // Check for null and undefined
        if(typeof(version1) == "undefined" || version1 == null)
            version1 = "0";
        
        if(typeof(version2) == "undefined" || version2 == null)
            version2 = "0";
        
        // Coerce to strings
        version1 = version1 + "";
        version2 = version2 + "";

        // Get the parts of the version    
        var partsVersion1 = version1.split(".");
        var partsVersion2 = version2.split(".");

        // Get the max of agent and control versions
        var i;
        for(i=0; i<partsVersion1.length && i<partsVersion2.length; i++)
        {
            var n1 = new Number(partsVersion1[i]);
            var n2 = new Number(partsVersion2[i]);
            if(n1 > n2)
            {
                // version 1 larger
                maxVersion = version1;
                break;
            }else if(n2 > n1)
            {
                // version 2 larger
                maxVersion = version2;
                break;
            }
        }
        
        if(i==partsVersion1.length || i==partsVersion2.length)
        {
            // Equal but different lengths, return the longer of the two
            if(partsVersion1.length > partsVersion2.length)
            {
                maxVersion = version1;
            }else
            {
                maxVersion = version2;
            }
        }
        
        return maxVersion;
    }

};




//=================================================================================
// Redirection logic
//=================================================================================

// Preserve legacy behavior with these global vars
var g_bV4Catalog = false;

/// <summary>
///     This class tracks checks performed against the client
///     environment and allows any given check to determine
///     that it is sufficent and no other checks should be
///     performed and also set a URL if applicable to which
///     the user should be redirected.  A null destinationUrl
///     with isSufficient=true, for example, indicates that 
///     the browser may stay at the current URL and no further
///     checks are necessary.
/// </summary>
function RedirectorDestination()
{
    this.isSufficient = false;
    this.destinationUrl = null;
}

/// <summary>
///     Facilitates redirection after assessing client environment
///     variables.
/// </summary>
function Redirector(clientEnvironment)
{
    this.clientEnvironment = clientEnvironment;
    
    // Get a new querystring that has been sanitized and stripped of lang settings
    this.safeQueryString = this._getSafeQueryStringFromUrl(this.clientEnvironment.currentUrl);
        
    // Preserve legacy behavior and set global to indicate if this is the V4 Catalog site
    this.isV4Catalog = (this.clientEnvironment.currentUrl.search("/catalog") > 0) && (this.clientEnvironment.currentSite == 4);
    g_bV4Catalog = this.isV4Catalog;
    
    //get the IE version number
    //we will use this later to check supported IE versions and special casing for IE 7 or greater
    this.ieVersion = 0;
    var regexResult = /MSIE ([1-9]+([0-9]*)(\.[0-9]+))/i.exec(this.clientEnvironment.userAgent);
    
    if (regexResult != null)
    {
        this.ieVersion = regexResult[1];
    }
    else 
    {
        var regexResult = /IE ([1-9]+([0-9]*)(\.[0-9]+))/i.exec(this.clientEnvironment.userAgent);
        if (regexResult != null)
        {
            this.ieVersion = regexResult[1];
        }
        else // In Win10, IE version isn't displayed as part of the userAgent string, so figure out if it is IE or Edge
        {
            var regexResult = /Windows NT ([1]+([0-9]+)(\.[0-9]+))/i.exec(this.clientEnvironment.userAgent);
            if (regexResult != null)
            {
                if (this.clientEnvironment.userAgent.indexOf("edge") == -1)   // It is IE
                {
                    this.ieVersion = 11;
                }
            }
        }
    }
}

Redirector.prototype = 
{

    /// <summary>
    ///     Jump to url and ensure all references in the target
    ///     URL to the http protocol are replaced with https
    ///     if the useHttps flag is true.
    /// </summary>
    /// <returns>
    ///     false if redirection not occuring and true otherwise.
    /// </returns>
    /// <remarks>
    ///     This function may return without redirecting if the
    ///     currentUrl is already the intended URL to prevent
    ///     infinite redirection.
    ///
    ///     Script can continue executing after setting the
    ///     location property of the window object.  Callers 
    ///     should take care that this behavior doesn't cause 
    ///     unintended side effects.
    /// </remarks> 
    redirect: function(url, useHttps)
    {
        // Return value
        var isRedirectionOccurring = false;
        
        if(!url)
            return isRedirectionOccurring;
            
        if(url.indexOf(V3Site) > -1 && this.clientEnvironment.currentSite == 3)
        {
            isRedirectionOccurring = true;
            this._writeV3Frameset();
        }
        else
        {
            var urlWithProtocolFixup = this._swapProtocol(url, useHttps);
            
            // Only redirect if we aren't already at the intended destination
            if(this._getBaseUrl(urlWithProtocolFixup) != this._getBaseUrl(this.clientEnvironment.currentUrl))
            {
                isRedirectionOccurring = true;
                location.href = urlWithProtocolFixup;
            }
        }
        
        return isRedirectionOccurring;
    },
    
    /// <summary>
    ///     Writes proper frameset for the V3 site.
    /// </summary>
    _writeV3Frameset: function()
    {
        document.open();
        document.write("<FRAMESET ROWS=100%>");
        if(this.clientEnvironment.userAgent.indexOf("windows 95") > 0) { 
            // Windows 95
            document.write("<FRAME SRC=\"Static_w95/V31site/default.htm" + location.search + "\">");
        }else{ 
            // Windows NT
            if(location.search == "" || location.search == null) {
                document.write("<FRAME SRC=\"scripts/redir.dll?\">");
            }else{
                document.write("<FRAME SRC=\"R1150/V31site/default.htm" + location.search + "\">");
            }
        }
        document.write("</FRAMESET>");
        document.close();
    },
    
    /// <summary>
    ///     Replace all occurrences of http with https protocol if 
    ///     useHttps is true.
    /// </summary>
    /// <remarks>
    ///     Pattern matches all instances of http: to pick up embedded
    ///     URLs in querystrings as well.
    /// </remarks>
    _swapProtocol: function(url, useHttps)
    {
        var urlWithProtocolFixup = url;
        if(useHttps)
        {
            // replace any instance of http: anywhere with https:
            // this covers returnUrl in QS as well as actual protocol of destination URL
            var regExp = /http:/g;
            urlWithProtocolFixup = urlWithProtocolFixup.replace(regExp, "https:");
        }
        return urlWithProtocolFixup;
    },
    
    /// <summary>
    ///     Get the base portion of the URL (up to but not including
    ///     the querystring).
    /// </summary>
    /// <returns>
    ///     Base portion of the URL.
    /// </returns>
    /// <remarks>
    ///     Empty string is returned if arguments are invalid.
    /// </remarks>
    _getBaseUrl: function(url)
    {
        var baseUrl = url;
        if(url != null && typeof(url) == typeof(""))
        {
            var qsIndex = url.indexOf("?");
            if(qsIndex > -1)
            {
                baseUrl = url.substring(0, qsIndex);
            }
            // Don't let trailing slashes alter the comparison
            if(baseUrl.substring(baseUrl.length-1) == "/")
            {
                baseUrl = baseUrl.substring(0, baseUrl.length-1);
            }
            
            baseUrl = baseUrl.toLowerCase();
        }
        
        return baseUrl;
    },
    
    /// <summary>
    ///     Scrub the querystring in the provided url and return it.
    /// </summary>
    _getSafeQueryStringFromUrl: function(url)
    {
        var qsCleaned = "";
        if(typeof(url) == typeof("") && url != null && url.indexOf("?") > -1)
        {
            var qsTemp = url.split("?")[1];		
            var qsParts = qsTemp.split("&");

            for(var i= 0; i < qsParts.length; i++){
                if(qsParts[i].toLowerCase().substr(0, 3) != "ln=" &&
                    qsParts[i].toLowerCase().substr(0, 10) != "returnurl=") {
                    qsCleaned += qsParts[i] + "&"; 
                }
            }
            qsCleaned = qsCleaned.substr(0, qsCleaned.length-1);  
        }

        return qsCleaned;
    },
    
    /// <summary>
    ///     Determine the destination when the site is down for maintenance.
    ///     This check is sufficient to determine the final destination when
    ///     the site destination is down.
    /// </summary>
    /// <remarks>
    ///     This function does not apply when on the v3 or v4 sites.
    /// </remarks>
    _getV5DownForMaintenanceUrl: function(redirectorDestination) {
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;
        
        // Shortcut var
        var client = this.clientEnvironment;
        
        // V5 - Check the down-for-maintenance indicator
        if(client.currentSite != "3" && client.currentSite != "4" )
        {
            var urlTemp = conRedrThanks + "ln=" + client.langID + "&thankspage=" + conThanksDown + "&os=";
            try{
                if(client.userAgent.indexOf("windows nt 5.0") > 0 && client.isDownForMaintenance2K) 
                {
                    redirectorDestination.destinationUrl = urlTemp + conOSWin2K + "&" + this.safeQueryString;
                    redirectorDestination.isSufficient = true;
                } 
                else if(client.userAgent.indexOf("windows nt 5.1") > 0 && client.isDownForMaintenanceXP) 
                {
                    redirectorDestination.destinationUrl = urlTemp + conOSWinXP + "&" + this.safeQueryString;
                    redirectorDestination.isSufficient = true;
                } 
                else if(client.userAgent.indexOf("windows nt 5.2") > 0 && client.isDownForMaintenance2003) 
                {
                    redirectorDestination.destinationUrl = urlTemp + conOSWin2003 + "&" + this.safeQueryString;
                    redirectorDestination.isSufficient = true;
                } 
                else if ((client.userAgent.indexOf("windows nt 6.0") > 0 || client.userAgent.indexOf("windows nt 6.1") > 0 || client.userAgent.indexOf("windows nt 6.2") > 0 || client.userAgent.indexOf("windows nt 6.3") > 0 || client.userAgent.indexOf("windows nt 10.0") > 0)
                    && client.isDownForMaintenanceLonghorn) 
                {
                    redirectorDestination.destinationUrl = urlTemp + conOSVista + "&" + this.safeQueryString;
                    redirectorDestination.isSufficient = true;
                }
            } catch(e) {
                // squash all errors and continue
            }
        }
    },
    
    /// <summary>
    ///     Determine the destination when the user is using WinCE.
    ///     This check is sufficient for WinCE machines to determine
    ///     a final destination.
    /// </summary>
    _getWinCEUrl: function(redirectorDestination) {
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;

        // Check for Windows CE
        if(this.clientEnvironment.userAgent.indexOf("; mspie") != -1) {
            // Windows CE thanks page
            redirectorDestination.isSufficient = true;
            redirectorDestination.destinationUrl = conRedrThanks + "ln=" + this.clientEnvironment.langID + "&thankspage=" + conThanksWinCE + "&" + this.safeQueryString;
        }
    },
    
    /// <summary>
    ///     Determine the destination when the user is using 2K Datacenter.
    ///     This check is sufficient for 2K Datacenter machines when not
    ///     on the V4 catalog site.
    /// </summary>
    _getDatacenterUrl: function(redirectorDestination) 
    {
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;
            
        // Shortcut vars
        var userAgent = this.clientEnvironment.userAgent;

        // Check for Windows 2000 Datacenter
        if((userAgent.indexOf("windows nt 5.0") != -1) && (userAgent.indexOf("; data center") != -1)) {
            if(!this.isV4Catalog)
            {
                // Windows 2000 Datacenter thanks page if they aren't already on the catalog (since that is also
                // a supported datacenter scenario and we shouldn't redirect user to consumer site from catalog).
                redirectorDestination.destinationUrl = conRedrThanks + "ln=" + this.clientEnvironment.langID + "&thankspage=" + conThanksDatacenter + "&" + this.safeQueryString;
                redirectorDestination.isSufficient = true;   
            }
        }
    },
    
    /// <summary>
    ///     Check if this is Win10+ and set redirect accordingly
    /// </summary>
    _getWin10PlusBrowserUrl: function (redirectorDestination) {
        // Short circuit if prior checks sufficient
        if (redirectorDestination.isSufficient)
            return;

        // Shortcut vars
        var userAgent = this.clientEnvironment.userAgent;
        
        var regexResult = /Windows NT ([1]+([0-9]+)(\.[0-9]+))/i.exec(this.clientEnvironment.userAgent);
        if (regexResult != null) {
            redirectorDestination.destinationUrl = WinBlueFWLink;   //  Redirect to this webpage for Edge & IE on Win10. Doing this for IE too because on Win10, IE can't get the controlVersion
            redirectorDestination.isSufficient = true;
        }
    },

    /// <summary>
    ///     Determine the destination based on the user's browser.
    ///     This check is sufficient to determine the final destination
    ///     for unsupported browsers.
    /// </summary>
    _getBrowserUrl: function(redirectorDestination) {
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;

        // Shortcut vars
        var userAgent = this.clientEnvironment.userAgent;
        var rawUserAgent = this.clientEnvironment.rawUserAgent;
        
        var isSupportedIEVersion = this.ieVersion >= 5; 

        var isUnsupportedBrowser = false;
        if(userAgent.indexOf("opera/") != -1 || userAgent.indexOf(" opera ") != -1) 
            isUnsupportedBrowser = true;
        
        // If we know it's not IE or is on the specifically unsupported list then
        // return a browerUrl
        if(!isSupportedIEVersion || isUnsupportedBrowser) {
            redirectorDestination.destinationUrl = conRedrThanks + "ln=" + this.clientEnvironment.langID + "&" + this.safeQueryString + "&thankspage=" + conThanksBadBrowser;
            redirectorDestination.isSufficient=true;
        }
    },
    
    /// <summary>
    ///     Determine the destination when the user is using 95 or NT.
    ///     This check is sufficient to determine the final destination
    ///     for those operating systems.
    /// </summary>
    /// <remarks>
    ///     Note that a V3 url will get special handling during the redirect method.
    /// </remarks>
    _get95NT4Url: function(redirectorDestination)
    {
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;

        // Shortcut var
        var userAgent = this.clientEnvironment.userAgent;

        if((userAgent.indexOf("windows 95") > 0) || ( userAgent.indexOf("windows nt)") >0 ) || ( userAgent.indexOf("windows nt;") >0 )  || ( userAgent.indexOf("windows nt 4") > 0 ) ) {
            redirectorDestination.destinationUrl = V3Site + "?" + this.safeQueryString;
            redirectorDestination.isSufficient = true;
        } 
    },
    
    /// <summary>
    ///     Determine the destination when the user is using 98.
    ///     This check is sufficient to determine the final destination
    ///     for those operating systems though a destination URL may not
    ///     be set in all 98 cases to allow the user to remain on the V4
    ///     Catalog.
    /// </summary>
    _get98Url: function(redirectorDestination) {	
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;

        if(this.clientEnvironment.userAgent.indexOf("windows 98") > 0) {
            // This check is sufficient if the OS is 98 regardless of whether we
            // determine if redirection is necessary.
            redirectorDestination.isSufficient = true;
            if (this.clientEnvironment.currentSite != 4)
            {
                redirectorDestination.destinationUrl = V4Site  + "?" + this.safeQueryString;    
            }
        }
    },
    
    /// <summary>
    ///     Determine a destination for any OS that is unsupported.  
    ///     This check is sufficient to determine the final destination
    ///     for unsupported operating systems.
    /// </summary>

    /// </summary>
    _getUnsupportedOSUrl: function(redirectorDestination) {	
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;

        if (this.clientEnvironment.os == conOSUnsupported)
        {
            redirectorDestination.destinationUrl = conRedrThanks + "ln=" + this.clientEnvironment.langID + "&thankspage=" + conThanksBadOS + "&" + this.safeQueryString;
            redirectorDestination.isSufficient = true;
        }
    },

    /// <summary>
    ///     Get V4Site destination for Windows XP, Server 2K3 or Windows XP x64 Edition
    ///     when the processor is 64-bit and the service pack level is either undetermined 
    ///    (likely due to client control problems) or is 0 - meaning SP level is RTM.
    ///     This check is sufficient in determining the final destination for the scenarios
    ///     listed above.
    /// </summary>
    _get64MUUrl: function(redirectorDestination){
        // Short circuit if prior checks sufficient
        if(redirectorDestination.isSufficient)
            return;
        
        // Shortcut var
        var client = this.clientEnvironment;
        
        // If this is the MU site and we are on a down-level OS
        if(client.isCurrentSiteMU && (client.os != conOSVista || client.os != conOSWin7 || client.os != conOSWin8 || client.os != conOSWinBlue || client.os != conOSWin10))
        {
            if( (client.userAgent.indexOf("windows nt 5.1") > 0 || client.userAgent.indexOf("windows nt 5.2") > 0) && 
            (client.servicePack == "" || client.servicePack == 0) && 
            (client.cpuClass == "ia64" || client.cpuClass == "wow64")) 
            {
                redirectorDestination.destinationUrl = V4Site  + "?" + this.safeQueryString;
                redirectorDestination.isSufficient = true;
            }
        }
    },
    
    

    /// <summary>
    ///     Modifies a url to replace all instances of "MicrosoftUpdate" with
    ///     "WindowsUpdate".
    /// </summary>
    /// <remarks>
    ///     This is only used when IEMode = noaddon 
    /// </remarks>
    changeMUToWUURL: function (url)
    {
        //if we're at an "ok" place, return null
        if (url == 'ok')
	{
	    return null;
	}

        //otherwise replace microsoftupdate with windowsupdate
        var correctUrl = url.replace(/MicrosoftUpdate/i, "WindowsUpdate");
        return correctUrl;
    },



    /// <summary>
    ///     Determine and return the best URL for the user given
    ///     a collection of environmental variables.
    /// </summary>
    getDestinationUrl: function()
    {
        // Return value
        var redirectorDestination = new RedirectorDestination();
        
        // Shortcut var
        var client = this.clientEnvironment;
        
        // Make initial checks using each of the helper functions, order is important
        // since earlier checks may indicate that they are sufficient and bypass later
        // checks
        this._getV5DownForMaintenanceUrl(redirectorDestination);
        this._getWinCEUrl(redirectorDestination);
        this._getDatacenterUrl(redirectorDestination);
        this._getWin10PlusBrowserUrl(redirectorDestination);
        this._getBrowserUrl(redirectorDestination);
        this._get95NT4Url(redirectorDestination);
        this._get98Url(redirectorDestination);
        this._getUnsupportedOSUrl(redirectorDestination);
        this._get64MUUrl(redirectorDestination);
        
        // Don't redirect when the following flag is set
        if(client.currentUrl.indexOf("g_sconsumersite") > -1)
        {
            return null;
        }
        
        // If the tests above are sufficient to determine the destination
        // ignore the remaining special cases
        if(!redirectorDestination.isSufficient)
        {
            // V4 catalog visitors are handled as a special case due to 
            // V4 catalog end of life approaching
            if(!this.isV4Catalog){
                try
                {
                    var qs = "OS=" + client.os + "&Processor=" + client.cpuClass + "&Lang=" + client.langID;
                    
                    if(client.currentUrl.indexOf("betathanksurl") > -1) {
                        qs += "&BetaThanksurl=true";
                    }
                    
                    if(!client.isControlCreatable && (client.os == conOSVista || client.os == conOSWin7  || client.os == conOSWin8 || client.os == conOSWinBlue || client.os == conOSWin10))
                        // Setting the current site to blank if the vista control is not present
                        // so the user is taken to the WU site 
                        qs += "&CurrentSite=";
                    else
                        qs += "&CurrentSite=" + client.currentSite;
                        
                    if(client.servicePack) qs += "&SP=" + client.servicePack;
                    if(client.clientVersion) qs += "&control=" + client.clientVersion;
                    if(client.isOptedIntoMU) qs += "&MUOptIn=true";
                    if(client.isManaged) qs += "&IsManaged=true";
                    
                    //send the querystring data to redirect.asp
                    var xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
                    xmlHttp.open("POST", "redirect.asp?" + qs , false);
                    xmlHttp.send("<send>Querystring</send>");
                    var responseXml = xmlHttp.responseText;
                    
                    //the URL is delimited bt @| so when we get the xml back split it by @| and get the url
                    var responseUrl = "";
                    var responseXmlParts = responseXml.split("@|");
                    if(responseXmlParts.length > 1) {				
                        responseUrl = getSafeResponse(responseXmlParts[1]);
                    } else {
                        responseUrl = conRedrThanks + "ln=" + client.langID;
                    }
                    
                    // Ensure destinationUrl is lower-cased for all comparisons below
                    responseUrl = responseUrl.toLowerCase();
                    
                    //If from IE7.0 and not on Vista
                    if((client.os != conOSVista || client.os != conOSWin7  || client.os != conOSWin8 || client.os != conOSWinBlue || client.os != conOSWin10) && this.ieVersion >= 7  
                        //doesn't belong on thanks page or on V4 or V5		
                        && responseUrl.indexOf("thanks") == -1 
                        && responseUrl.indexOf("v4.") == -1 
                        && responseUrl.indexOf("v5.") == -1 
                        //and contains the iemode=noaddon querystring parameter
                        && this.clientEnvironment.currentUrl.indexOf("iemode=noaddon") > -1 )
                    {
                        redirectorDestination.destinationUrl = this.changeMUToWUURL(responseUrl);
                        if (redirectorDestination.destinationUrl != null)
                        {
                            redirectorDestination.destinationUrl += ("?" + this.safeQueryString);
                        }
                        redirectorDestination.isSufficient = true;
                    }
                    
                    // If the service URL applies (in scenarios where user arrives on
                    // WU site but is opted in) we need to redirect to the URL that
                    // corresponsds to that opted-in service.  
                    if(!redirectorDestination.isSufficient && responseUrl == "service url") {
                        if(typeof(client.serviceUrl) == typeof("") && client.serviceUrl.length > 0) {
                            redirectorDestination.destinationUrl = serviceUrl;
                        }else{
                            // If we didn't find a service URL then go to the thanks page
                            redirectorDestination.destinationUrl = conRedrThanks + "ln=" + client.langID;
                        }
                        
                        redirectorDestination.isSufficient = true;
                    }
                    
                    // Only need to provide a destination URL when the responseUrl is not "ok"
                    if(!redirectorDestination.isSufficient && responseUrl != "ok")
                    {
                        if(this.safeQueryString.length > 0)
                        {
                            if(responseUrl.indexOf("?") > -1)
                            {
                                redirectorDestination.destinationUrl = responseUrl + "&" + this.safeQueryString;
                            }
                            else 
                            {
                                redirectorDestination.destinationUrl = responseUrl + "?" + this.safeQueryString;
                            }
                        }
                        else
                        {
                            redirectorDestination.destinationUrl = responseUrl;
                        }
                        
                        redirectorDestination.isSufficient = true;
                    }
                }
                catch (e)
                {
                    // Leave the user on the URL they requested if an
                    // unexpected exception occurred in the script
                    redirectorDestination.destinationUrl = null;
                    redirectorDestination.isSufficient = true;
                }
            }
            //If V4 Catalog
            else
            {
                // If on vista Redirect directly to V7Cat.
                if(client.os == conOSVista || client.os == conOSWin7  || client.os == conOSWin8 || client.os == conOSWinBlue || client.os == conOSWin10){
                    redirectorDestination.destinationUrl = V7Cat;
                }
                // If they come to catalog on winxp, win2k3, win2k 
                // and haven't been to this page previously then give them thanks page
                else if(client.os == conOSWin2K 
        		        || client.os == conOSWinXP 
        		        || client.os == conOSWin2003)
                {
                    redirectorDestination.destinationUrl = V7Cat;
                }
            }
        }
        
        // Return the destinationUrl as determined by the various checks in this function
        return this._swapProtocol(redirectorDestination.destinationUrl, this.clientEnvironment.isHttps);
    }   
};



//=================================================================================
// Shared Function
//=================================================================================

/// <summary>
///     Strips the response of any values that could inject bad
///     script into our site and cleans it prior to use.
/// </summary>
/// <remarks>
///     Client script cannot reliably scrub out bad response settings
///     as injected script could rewrite JS functions on the client
///     prior to it ever scrubbing anything making it a noop.
///     However, having these types of checks throughout the server
///     and client code offers multiple layers of defense. 
/// </remarks>
function getSafeResponse(responseUrl)
{
    if (responseUrl.length > 255)
    {
        responseUrl = responseUrl.substring(0,255);
    }	
    // need to remove document.write & response.write
        
    while(responseUrl.indexOf("document.write") > -1)
    {
        responseUrl = responseUrl.replace("document.write","");
    }		
    while(responseUrl.indexOf("response.write") > -1)
    {
        responseUrl = responseUrl.replace("response.write","");
    }	
    while(responseUrl.indexOf("<%") > -1)
    {
        responseUrl = responseUrl.replace("<%","");
    }
    while(responseUrl.indexOf("%>") > -1)
    {
        responseUrl = responseUrl.replace("%>","");
    }
    return responseUrl;
}



function fnRedirect()
{
    var clientEnvironment = new ClientEnvironment();
    var redirector = new Redirector(clientEnvironment);
    var destinationUrl = redirector.getDestinationUrl();
    if(null != destinationUrl)
        redirector.redirect(destinationUrl);
}

fnRedirect();
