using System.Web.Services;

namespace ICM.Forms
{

	public partial class Default : System.Web.UI.Page
	{
		private System.Timers.Timer _timerCheckICMStatus;
		private bool _maintenanceMode = false;
		
        public void Page_PreRender(object sender, System.EventArgs e)
        {
            pnlError.Visible = false;
            //this.Page.ClientScript.GetPostBackEventReference(RunICMPanel, "");
        }

        public void Page_Load(object sender, System.EventArgs e)
        {
            string oUserName = "Unknown User";

            //now see if the user has permission
            string oGreeting = "Welcome ";
            lblGreeting.Text = oGreeting;
			lblUserNumber.Text = Request.ServerVariables["LOGON_USER"];
			
            string ICMConnectionString= System.Configuration.ConfigurationManager.ConnectionStrings["devICMConnection"].ConnectionString;
            using (System.Data.SqlClient.SqlConnection dbConn = new System.Data.SqlClient.SqlConnection(ICMConnectionString))
			{
				dbConn.Open();

                string sql = "SELECT ICM_USER_ID, USERNAME, USER_FNAME, USER_SNAME, USER_GROUPID FROM ICM.dbo.CONFIG_ICM_ADMIN_USERS WHERE UPPER([USERNAME]) = '" + Request.ServerVariables["LOGON_USER"].ToUpper() + "'";
               
				using(System.Data.SqlClient.SqlCommand getuserperm = new System.Data.SqlClient.SqlCommand(sql, dbConn))
				{
                    using(System.Data.SqlClient.SqlDataReader rdr = getuserperm.ExecuteReader())
                    {
                        if(rdr.Read())
                        {
                            //lblGreeting.Text = oGreeting + rdr["USER_FNAME"];
                            Session["loggedinuser"] = rdr["username"];
                            Session["loggedingroup"] = rdr["USER_GROUPID"];

                            //IF THE USER EXISTS THEN GO GET THAT USERS MENU OPTION
                            dsmenu.SelectCommand = "SELECT SCREEN_NAME, SCREEN_TITLE FROM ICM.dbo.CONFIG_ICM_ADMIN_SCREENS WHERE GROUP_ID = " + Session["loggedingroup"] + " ORDER BY ICM_SCREEN_ID";
                            dsmenu.DataBind();
                        }
                        else
                        {
                            Server.Transfer("unknownuser.aspx", true);
                        }
                    }
                }
				
				string SP = "SP";
				int i = 0;
				sql = "SELECT PARAMETER_VALUE FROM CONFIG_SYSTEM_PARAMETERS WHERE PARAMETER_NAME IN ('PERIOD_MONTH', 'PERIOD_YEAR', 'MAINTENANCE_MODE')";
				using(System.Data.SqlClient.SqlCommand getuserperm = new System.Data.SqlClient.SqlCommand(sql, dbConn))
				{
                    using(System.Data.SqlClient.SqlDataReader rdr = getuserperm.ExecuteReader())
                    {
                        while(rdr.Read())
                        {
							i++;
							if(i == 1)
							{
								_maintenanceMode = rdr["PARAMETER_VALUE"].ToString() == "1";
								if(!_maintenanceMode)
								{	
									pnlRunICMInfo.CssClass = "status";
									pnlUnderMaintenance.CssClass = "hidden";
								}
								else
								{
									pnlRunICMInfo.CssClass = "hidden";
									pnlUnderMaintenance.CssClass = "maintenance";
									lblMaintenanceMode.Text = rdr["PARAMETER_VALUE"].ToString();
									
									SetAllDisabled();
								}
															
							}
							else if(i == 2)
							{
								SP += rdr["PARAMETER_VALUE"].ToString();	
							}
							else if(i == 3)
							{
								SP = "FY" + rdr["PARAMETER_VALUE"].ToString() + "-" + SP;
								lblSalePeriod.Text = SP;
							}
                        }

						
                    }
                }
				
				sql = "SELECT PARAMETER_VALUE FROM CONFIG_SYSTEM_PARAMETERS WHERE PARAMETER_NAME IN ('PERIOD_MONTH', 'PERIOD_YEAR')";
				using(System.Data.SqlClient.SqlCommand getuserperm = new System.Data.SqlClient.SqlCommand(sql, dbConn))
				{
                    using(System.Data.SqlClient.SqlDataReader rdr = getuserperm.ExecuteReader())
                    {
                        while(rdr.Read())
                        {
							i=i+1;
							if(i == 1)
							{
								SP += rdr["PARAMETER_VALUE"].ToString();
							}
							else if(i == 2)
							{
								SP = "FY" + rdr["PARAMETER_VALUE"].ToString() + "-" + SP;
							}
                        }

						lblSalePeriod.Text = SP;
                    }
                }
				
				if(Session["ForceICMMsg"] != null)
				{
					lblInfo.Text = Session["ForceICMMsg"].ToString();
					
					
					//Session.Remove("ForceICMMsg");
				}
				
            }

            CheckICMStatus();
							
			_timerCheckICMStatus = new System.Timers.Timer();
			_timerCheckICMStatus.Elapsed += CheckICMStatus_Tick;
			_timerCheckICMStatus.Interval = 3000;
			_timerCheckICMStatus.Start();
			
			
			
			
			

            string controlName = Request.Params.Get("__EVENTTARGET");
            string argument = Request.Params.Get("__EVENTARGUMENT");

            //RunICMPanel.Click += new EventHandler(RunICM);
            if(controlName == "RunICMPanel" && argument == "Click" && !_maintenanceMode)
            {
                FlagICMToRunWithin5Mins();
                //RunICM(null, null);
            }
            else if (controlName == "ICMCheck" && argument == "Timer")
            {
                CheckICMStatus();
            }

        }

		protected void SetAllDisabled()
		{
			
		}

		protected void HideInfoMsg_Tick(object sender, System.EventArgs e)
		{
			//TimerDisplayInfo.Enabled = false;
			lblInfo.Text = "";
		}

		protected void CheckICMStatus_Tick(object sender, System.EventArgs e)
		{
			lblInfo.Text = "PomPomPom";
			// Update the stock price
			//CheckICMStatus();
		}

        public void CheckICMStatus() {
            string ICMConnectionString = System.Configuration.ConfigurationManager.ConnectionStrings["devICMConnection"].ConnectionString;
            using (System.Data.SqlClient.SqlConnection dbConn = new System.Data.SqlClient.SqlConnection(ICMConnectionString))
			{
				dbConn.Open();
                
				using(System.Data.SqlClient.SqlCommand runICMCmd = new System.Data.SqlClient.SqlCommand("SELECT TOP(1) BEGIN_DATE, END_DATE, STATUS FROM RUN_ICM_INFO ORDER BY RUN_ICM_INFO_ID DESC", dbConn))
				{	
                    using (System.Data.SqlClient.SqlDataReader rdr = runICMCmd.ExecuteReader())
					{
                        if (rdr.Read())
                        {
                            pnlRunICMInfo.Visible = true;
                            lblLastRunDateStart.Text = rdr["BEGIN_DATE"].ToString();
                            lblLastRunDateEnd.Text = rdr["END_DATE"].ToString();
                            lblLastRunStatus.Text = rdr["STATUS"].ToString();
                        }
					}
                }

                dbConn.Close();
            }
        }

        private void FlagICMToRunWithin5Mins(){
            //lblCurrentRunDate.Text = "";
            //lblCurrentRunStatus.Text = "Running ...";
            pnlError.Visible = false;
            //lblStatus.Text = "plop";
            //lblLastRun.Text = "2023/06/07 16:42:13";
            string ICMConnectionString = System.Configuration.ConfigurationManager.ConnectionStrings["devICMConnection"].ConnectionString;
			using (System.Data.SqlClient.SqlConnection dbConn = new System.Data.SqlClient.SqlConnection(ICMConnectionString))
			{
				dbConn.Open();
				using(System.Data.SqlClient.SqlCommand runICMCmd = new System.Data.SqlClient.SqlCommand("dbo.usp_FRONTEND_ICM__FORCE_RUN", dbConn))
				{
					runICMCmd.CommandType = System.Data.CommandType.StoredProcedure;
					runICMCmd.ExecuteNonQuery();
					Session["ForceICMMsg"] = "ICM Forced to run within 1 min max";
					dbConn.Close();
				}
			}
		}

    }
}