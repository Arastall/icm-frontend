<% @Page Language="C#" AutoEventWireup="true" CodeFile="Default.aspx.cs" Inherits="ICM.Forms.Default" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" >
<head runat="server">
    <title>ICM</title>
    <link rel="stylesheet" type="text/css" href="/css/core.css" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="stylesheet" href="css/newstyle.css">
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js"></script>
	
</head>
<script type="text/javascript">  

    function SetIcon(screenName) { 
        if (screenName == undefined || screenName == null)
            return;
        
        var dom = document.getElementById(screenName);

		

        var result = '';
        switch(screenName)
        {
            case 'Employee_summary_new.aspx':
                result = 'accessibility-outline';
                break;
            case 'Position_History.aspx':
                result = 'book-outline';
                break;
            case 'Order_summary.aspx':
                result = 'reorder-four-outline';
                break;
            case 'icmEmployee_targets.aspx':
                result = 'contract-outline';
                break;
            case 'ManualAdjustment.aspx':
                result = 'options-outline';
                break;
            case 'Manual_Adj_listing.aspx':
			case 'ManageAdjustments.html':
                result = 'list-outline';
                break;
            case 'ReprocessOrder.aspx':
                result = 'repeat-outline';
                break;
            case 'NewcomersManagement.aspx':
                result = 'person-add-outline';
                break;
            case 'AchievementsAgainstTarget.aspx':
                result = 'trending-up-outline';
                break;
			/*case default:
				result = 'plop';
				break;*/
        }

		//alert(screenName + '  ' + result);

        dom.setAttribute('name', result);
    } 

    function GoToPage(page)
    {
		var val = document.getElementById("lblMaintenanceMode").innerHTML;
		if(val == "0")
		{
			location.href=page;
		}
		else
		{
			alert('Please wait for the maintenance to be complete. Thanks');
		}
    }

    function RunICM(){
        var answer = confirm('Do you confirm you want to Run ICM Process now ?');
        if(answer)
        {
            __doPostBack('RunICMPanel', 'Click');
        }
    }
</script>  
<body>

    <form class="form" runat="server">
        <!--#include file="ICMHeader.aspx"-->
		<asp:label runat="server" ID="lblMaintenanceMode" class="hidden">0</asp:label>
        <div class="title" runat="server">
            <h2 id="txtscreename"><asp:label runat="server" ID="lblGreeting"></asp:label> to ICM UK Tool !</h2>
            Here you are able to view payments, allocations, targets etc for the NeoPost sales force for <br/>Financial Year 2020 to present day...
        </div>


        <asp:Panel class="status" runat="server" ID="pnlRunICMInfo">
			<span>Your ICM User : <asp:label runat="server" ID="lblUserNumber" class="state"></asp:label></span><br/>
            <span>Last Run Start : <asp:label runat="server" ID="lblLastRunDateStart" class="state"></asp:label></span><br/>
            <span>Last Run End : <asp:label runat="server" ID="lblLastRunDateEnd" class="state"></asp:label></span><br/>
            <span>Last Run Status : <asp:label runat="server" ID="lblLastRunStatus" class="state"></asp:label></span><br/>
			<span>Current Sale Period : <asp:label runat="server" ID="lblSalePeriod" class="state"></asp:label></span><br/>
        </asp:Panel>
		<asp:Panel class="maintenance" runat="server" ID="pnlUnderMaintenance">
			<asp:label runat="server" ID="lblMaintenance" class="state">Under maintenance</asp:label>
		</asp:Panel>
		
		<asp:Panel ID="pnlInfo" class="pnlinfo" runat="server">
            <asp:label runat="server" ID="lblInfo"></asp:label>
        </asp:Panel> 
		
        <div class="menuBox">
            <asp:Repeater ID="menu" runat="server" DataSourceID="dsmenu">
                <ItemTemplate>
                    <div class="card" onclick=GoToPage('<%#DataBinder.Eval(Container.DataItem, "SCREEN_NAME")%>')>
                        <span class="label"><%#DataBinder.Eval(Container.DataItem, "SCREEN_TITLE")%></span>
                        <ion-icon id='<%#DataBinder.Eval(Container.DataItem, "SCREEN_NAME")%>' name=""></ion-icon>
                        <script>
                            SetIcon('<%#DataBinder.Eval(Container.DataItem, "SCREEN_NAME")%>');
                        </script>
                    </div>
                </ItemTemplate>
            </asp:Repeater>
        </div>
		
		<div class="title" style="margin-top: 80px">
            <h2 id="txtscreename">New features</h2>
            New implemented features available here
        </div>
        <div class="menuBox">
            <div class="card" onclick=GoToPage('GenerateDealsReports.html')>
                <span class="label">Generate Reports</span>
                <ion-icon id='GenerateDealsReports.html' name="download-outline"></ion-icon>
            </div>
			<div class="card" onclick=GoToPage('ManageAdjustments.html')>
                <span class="label">Manage Adjustments</span>
                <ion-icon id='ManageAdjustments.html' name="options-outline"></ion-icon>
            </div>
			<div class="card" onclick=GoToPage('ManageSalesPeriod.html')>
                <span class="label">Lock Sales Period</span>
                <ion-icon id='ManageSalesPeriod.html' name="key-outline"></ion-icon>
            </div>
			<div class="card" onclick="GoToPage('ICMProcessRunner.html')">
                <span class="label">ICM Process</span>
                <ion-icon id='ICMProcessRunner.html' name="play-circle-outline"></ion-icon>
            </div>
        </div>
        
        <asp:SqlDataSource ID="dsmenu" runat="server" SelectCommand="" ConnectionString="<%$ ConnectionStrings:ICMConnection %>"></asp:SqlDataSource>

        <asp:Panel ID="pnlError" class="error" runat="server">
            <asp:label runat="server" ID="lblError"></asp:label>
        </asp:Panel>       
    </form>

    <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
	<script src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>
</body>
</html>
