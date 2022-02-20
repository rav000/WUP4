Function vbsToLocaleDateString(sDate)
	vbsToLocaleDateString = FormatDateTime(CDate(sDate), vbLongDate)
End Function

Function vbsToLocaleNumber(n)
	vbsToLocaleNumber = FormatNumber(n)
End Function