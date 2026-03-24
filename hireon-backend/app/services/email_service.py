"""
Email service using Gmail SMTP.
Falls back to console print if SMTP credentials are not configured.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dateutil import parser as date_parser

from app.config import settings

logger = logging.getLogger(__name__)


def _send_smtp(to: str, subject: str, html_body: str) -> None:
    """Send email via Gmail SMTP."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to, msg.as_string())


def send_email(to: str, subject: str, html_body: str) -> None:
    """Send email or print to console if SMTP not configured."""
    if not settings.smtp_user or not settings.smtp_password:
        # Console fallback — great for development
        logger.info(f"\n{'='*60}")
        logger.info(f"📧 EMAIL (console fallback)")
        logger.info(f"To: {to}")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body:\n{html_body}")
        logger.info(f"{'='*60}\n")
        return

    try:
        _send_smtp(to, subject, html_body)
        logger.info(f"Email sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")


# ── Email templates ────────────────────────────────────────────────────────────

# ── Email templates ────────────────────────────────────────────────────────────

def _get_base_template(content_html: str) -> str:
    """Provides a consistent, premium wrapper for all emails."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
            body, table, td, div, p, a {{ font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif !important; }}
            body {{ margin: 0; padding: 0; background-color: #f8f7ff; }}
            .wrapper {{ width: 100%; background-color: #f8f7ff; padding: 40px 0; }}
            .container {{ max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(108, 71, 255, 0.05); }}
            .header {{ padding: 48px 40px 32px; text-align: center; }}
            .content {{ padding: 0 48px 48px; text-align: center; color: #1a1040; }}
            .logo-wrap {{ display: inline-flex; align-items: center; gap: 12px; margin-bottom: 40px; }}
            .logo-square {{ background: linear-gradient(135deg, #6c47ff, #ff6bc6); width: 44px; height: 44px; border-radius: 12px; display: inline-block; vertical-align: middle; }}
            .logo-text {{ font-size: 32px; font-weight: 800; color: #6c47ff; letter-spacing: -1px; display: inline-block; vertical-align: middle; margin-left: 8px; }}
            h2.title {{ font-size: 28px; font-weight: 800; margin: 0 0 16px 0; color: #0f172a; letter-spacing: -0.5px; }}
            p.description {{ font-size: 16px; line-height: 1.6; color: #64748b; margin: 0 0 32px 0; }}
            .info-box {{ background-color: #fbfaff; border-radius: 20px; padding: 32px; margin: 32px 0; text-align: left; border: 1px solid #f1f0ff; }}
            .info-label {{ font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }}
            .info-value {{ font-size: 17px; color: #1e293b; font-weight: 700; margin-bottom: 24px; }}
            .info-value:last-child {{ margin-bottom: 0; }}
            .button-wrap {{ margin: 40px 0; text-align: center; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #6c47ff, #ff6bc6); color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 18px 48px; border-radius: 14px; box-shadow: 0 8px 20px rgba(108, 71, 255, 0.25); font-size: 16px; }}
            .footer {{ padding: 32px 48px; text-align: center; border-top: 1px solid #f8f7ff; color: #94a3b8; font-size: 13px; }}
            .footer a {{ color: #6c47ff; text-decoration: none; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <div class="logo-wrap">
                        <div class="logo-square">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="44" height="44">
                                <tr>
                                    <td align="center" valign="middle">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="20" height="20">
                                            <tr>
                                                <td width="4" height="20" rowspan="3" style="background-color: #ffffff; border-radius: 2px;"></td>
                                                <td width="12" height="8"></td>
                                                <td width="4" height="20" rowspan="3" style="background-color: #ffffff; border-radius: 2px;"></td>
                                            </tr>
                                            <tr>
                                                <td width="12" height="4" style="background-color: #ffffff; border-radius: 2px;"></td>
                                            </tr>
                                            <tr>
                                                <td width="12" height="8"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <span class="logo-text">Hireon</span>
                    </div>
                </div>
                <div class="content">
                    {content_html}
                </div>
                <div class="footer">
                    <p style="margin-bottom: 8px;">Need help? Contact <a href="mailto:support@hireon.ai">support@hireon.ai</a></p>
                    <p style="margin: 0;">&copy; 2026 Hireon AI Platform. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def _get_calendar_invite_template(
    title: str,
    when: str,
    organizer: str,
    guests: list[str],
    meeting_link: str,
    date_month: str,
    date_day: str,
    date_weekday: str
) -> str:
    """Specialized template for Calendar-style invitations."""
    guests_html = "".join([f'<div style="margin-bottom: 4px;">{g}</div>' for g in guests])
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap');
            body, table, td, div, p, a {{ font-family: 'Roboto', Arial, Helvetica, sans-serif !important; }}
            body {{ margin: 0; padding: 0; background-color: #f8f9fa; }}
            .container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dadce0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
            .branding {{ padding: 24px 24px 0; text-align: left; }}
            .logo-square {{ background: linear-gradient(135deg, #6c47ff, #ff6bc6); width: 32px; height: 32px; border-radius: 8px; display: inline-block; vertical-align: middle; }}
            .logo-text {{ font-family: 'Plus Jakarta Sans', sans-serif !important; font-size: 24px; font-weight: 800; color: #6c47ff; letter-spacing: -1px; display: inline-block; vertical-align: middle; margin-left: 8px; }}
            .header {{ padding: 24px; border-bottom: 1px solid #dadce0; display: table; width: 100%; box-sizing: border-box; }}
            .date-box {{ width: 52px; height: 64px; border: 1px solid #dadce0; border-radius: 8px; text-align: center; float: left; margin-right: 20px; overflow: hidden; background: #ffffff; }}
            .date-month {{ background-color: #ffffff; color: #d93025; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 0; border-bottom: 1px solid #dadce0; }}
            .date-day {{ font-size: 24px; font-weight: 400; color: #3c4043; padding-top: 4px; }}
            .header-info {{ display: table-cell; vertical-align: top; }}
            .event-title {{ font-size: 20px; font-weight: 500; color: #3c4043; margin: 0 0 4px 0; }}
            .calendar-link {{ font-size: 13px; color: #1a73e8; text-decoration: none; }}
            .content {{ padding: 24px; color: #3c4043; line-height: 1.5; }}
            .section-title {{ font-size: 14px; font-weight: 700; color: #3c4043; margin-bottom: 4px; }}
            .section-value {{ font-size: 14px; color: #3c4043; margin-bottom: 24px; }}
            .btn-blue {{ background-color: #1a73e8; color: #ffffff !important; text-decoration: none; padding: 10px 24px; border-radius: 4px; font-weight: 500; font-size: 14px; display: inline-block; margin: 20px 0; }}
            .meet-link {{ font-size: 14px; color: #70757a; }}
            .meet-link a {{ color: #1a73e8; text-decoration: none; }}
            .footer {{ background-color: #f8f9fa; padding: 24px; border-top: 1px solid #dadce0; text-align: center; font-size: 12px; color: #70757a; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="branding">
                <div class="logo-square">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="32" height="32">
                        <tr>
                            <td align="center" valign="middle">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="16" height="16">
                                    <tr>
                                        <td width="3" height="16" rowspan="3" style="background-color: #ffffff; border-radius: 1px;"></td>
                                        <td width="10" height="6"></td>
                                        <td width="3" height="16" rowspan="3" style="background-color: #ffffff; border-radius: 1px;"></td>
                                    </tr>
                                    <tr>
                                        <td width="10" height="4" style="background-color: #ffffff; border-radius: 1px;"></td>
                                    </tr>
                                    <tr>
                                        <td width="10" height="6"></td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
                <span class="logo-text">Hireon</span>
            </div>
            <div class="header">
                <div class="date-box">
                    <div class="date-month">{date_month}</div>
                    <div class="date-day">{date_day}</div>
                </div>
                <div class="header-info">
                    <h1 class="event-title">{title}</h1>
                    <a href="#" class="calendar-link">View on Google Calendar</a>
                    <div style="font-size: 13px; color: #70757a; margin-top: 8px;">
                        {date_weekday}, {date_month} {date_day}, 2026
                    </div>
                </div>
            </div>
            <div class="content">
                <div style="float: right; width: 40%; border-left: 1px solid #dadce0; padding-left: 24px;">
                    <div class="section-title">Agenda</div>
                    <div class="section-value" style="font-size: 12px; color: #70757a; letter-spacing: 0.2px;">
                        {date_weekday} {date_month} {date_day}, 2026<br/>
                        <b style="color: #3c4043;">10:00 AM</b><br/>
                        {title}
                    </div>
                </div>
                <div style="width: 50%;">
                    <div class="section-title">When</div>
                    <div class="section-value">{when}</div>

                    <div class="section-title">Who</div>
                    <div class="section-value" style="line-height: 1.8;">
                        {organizer}* (Organizer)<br/>
                        {guests_html}
                    </div>

                    <a href="{meeting_link}" class="btn-blue">Join with Google Meet</a>
                    
                    <div class="meet-link">
                        <b>Meeting link</b><br/>
                        <a href="{meeting_link}">{meeting_link.replace('https://', '')}</a>
                    </div>
                </div>
                <div style="clear: both;"></div>
            </div>
            <div class="footer">
                Need help? <a href="mailto:support@hireon.ai" style="color: #1a73e8; text-decoration: none;">support@hireon.ai</a><br/>
                &copy; 2026 Hireon AI Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

def _format_date_for_calendar(date_str: str) -> tuple[str, str, str]:
    """Helper to extract (weekday, month, day) from various date string formats."""
    try:
        # Use dateutil for robust parsing
        dt = date_parser.parse(date_str, fuzzy=True)
        return dt.strftime("%a"), dt.strftime("%b"), dt.strftime("%d")
    except Exception as e:
        logger.warning(f"Could not parse date '{date_str}': {e}")
        return "Thu", "Mar", "19"


def send_interviewer_invite(
    interviewer_email: str,
    interviewer_name: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    scheduled_at: str,
    meeting_link: str,
    duration_minutes: int,
    interview_type: str,
) -> None:
    subject = f"Interview Scheduled: {candidate_name} for {job_title}"
    weekday, month, day = _format_date_for_calendar(scheduled_at)

    html = _get_calendar_invite_template(
        title=f"Interview: {candidate_name} — {job_title}",
        when=scheduled_at,
        organizer=f"{company_name} Recruiting",
        guests=[interviewer_email, candidate_name],
        meeting_link=meeting_link or "#",
        date_month=month,
        date_day=day,
        date_weekday=weekday
    )
    send_email(interviewer_email, subject, html)


def send_interview_invite(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    scheduled_at: str,
    meeting_link: str,
    duration_minutes: int = 60,
    interview_type: str = "video",
) -> None:
    subject = f"Interview Invitation — {job_title} at {company_name}"
    weekday, month, day = _format_date_for_calendar(scheduled_at)

    html = _get_calendar_invite_template(
        title=f"Technical Round: {job_title}",
        when=scheduled_at,
        organizer=f"{company_name} Recruiting",
        guests=[candidate_email],
        meeting_link=meeting_link or "#",
        date_month=month,
        date_day=day,
        date_weekday=weekday
    )
    send_email(candidate_email, subject, html)


def send_offer_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    offer_url: str,
) -> None:
    subject = f"Offer Letter — {job_title} at {company_name}"
    content = f"""
        <h2 class="title">Congratulations, {candidate_name}!</h2>
        <p class="description">We are thrilled to extend an offer for the <strong>{job_title}</strong> position at <strong>{company_name}</strong>. We can't wait to have you on the team!</p>
        
        <div style="margin: 40px 0;">
            <a href="{offer_url}" class="button">View Offer Letter</a>
        </div>
        
        <p style="font-size: 14px; color: #9689bb;">Please review and respond within the specified deadline.</p>
    """
    send_email(candidate_email, subject, _get_base_template(content))


def send_stage_update_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    new_stage: str,
) -> None:
    subject = f"Application Update — {job_title} at {company_name}"
    stage_pretty = new_stage.replace('_', ' ').title()
    content = f"""
        <h2 class="title">Application Update</h2>
        <p class="description">Dear {candidate_name}, your application for <strong>{job_title}</strong> at <strong>{company_name}</strong> has progressed.</p>
        
        <div class="info-box">
            <div class="info-label">Current Stage</div>
            <div class="info-value">{stage_pretty}</div>
        </div>

        <p style="font-size: 14px; color: #9689bb;">Thank you for your interest in joining our team. We will keep you updated on further progress.</p>
    """
    send_email(candidate_email, subject, _get_base_template(content))


def send_candidate_invite(
    candidate_email: str,
    candidate_name: str,
    company_name: str,
    portal_url: str,
) -> None:
    subject = f"Join the {company_name} Candidate Portal"
    content = f"""
        <h2 class="title" style="margin-top: 20px;">You're Invited!</h2>
        <p class="description">Hi {candidate_name.split()[0]}, the team at <strong>{company_name}</strong> has invited you to join their candidate portal. This will allow you to track your applications, explore new roles, and stay connected with our team.</p>
        
        <div class="button-wrap">
            <a href="{portal_url}" class="button">Set Up Your Portal Profile</a>
        </div>
        
        <p style="font-size: 14px; color: #94a3b8; border-top: 1px solid #f1f0ff; padding-top: 32px; margin-top: 32px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
    """
    send_email(candidate_email, subject, _get_base_template(content))


def send_team_invite(
    to_email: str,
    to_name: str,
    invited_by: str,
    company_name: str,
    role: str,
    password: str,
    login_url: str,
) -> None:
    subject = f"You've been invited to join {company_name}"
    fname = to_name.split()[0].title() if to_name else "Team Member"
    display_role = role.replace('_', ' ').title()
    
    content = f"""
        <h2 class="title" style="margin-top: 20px;">Join the team</h2>
        <p class="description">Hi {fname}, you've been invited by <strong>{invited_by}</strong> to join <strong>{company_name}</strong> as a <strong>{display_role}</strong>.</p>
        
        <div class="info-box">
            <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Access Credentials</p>
            <div class="info-label">Email</div>
            <div class="info-value" style="color: #6c47ff;">{to_email}</div>
            <div class="info-label">Temporary Password</div>
            <div class="info-value" style="font-size: 22px;">{password}</div>
        </div>

        <div class="button-wrap">
            <a href="{login_url}" class="button">Complete Your Setup</a>
        </div>

        <p style="font-size: 14px; color: #94a3b8; font-style: italic; margin-top: 32px;">Please change your temporary password once you log in for the first time.</p>
    """
    send_email(to_email, subject, _get_base_template(content))


def send_rejection_email(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
) -> None:
    subject = f"Application Update: {job_title} at {company_name}"
    content = f"""
        <h2 class="title">Application Update</h2>
        <p class="description">Hi {candidate_name.split()[0]},</p>
        <p class="description">Thank you for your interest in the <strong>{job_title}</strong> position at <strong>{company_name}</strong>.</p>
        <p class="description">After careful review of your profile, we have decided to move forward with other candidates at this time who more closely align with our current needs. However, we were impressed with your background and will keep your profile in our talent pool for future opportunities.</p>
        
        <div class="info-box">
            <div class="info-label">Status</div>
            <div class="info-value">Application Closed</div>
        </div>

        <p style="font-size: 14px; color: #9689bb; margin-top: 32px;">We wish you the very best in your job search and future professional endeavors.</p>
    """
    send_email(candidate_email, subject, _get_base_template(content))
 
 
def send_interview_cancellation(
    to_email: str,
    to_name: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    scheduled_at: str,
    reason: str | None = None,
) -> None:
    subject = f"Interview Cancelled: {candidate_name} — {job_title}"
    fname = to_name.split()[0].title() if to_name else "Team Member"
    reason_html = f"""
        <div style="margin-top: 24px; padding: 24px; background: rgba(239, 68, 68, 0.03); border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.1);">
            <div class="info-label" style="color: #ef4444;">Reason for Cancellation</div>
            <div style="font-size: 15px; color: #1e293b; font-weight: 700;">{reason}</div>
        </div>
    """ if reason else ""
    
    content = f"""
        <h2 class="title" style="color: #ef4444; margin-top: 20px;">Interview Cancelled</h2>
        <p class="description">Hi {fname}, the interview scheduled for <strong>{candidate_name}</strong> ({job_title}) on {scheduled_at} has been cancelled.</p>
        {reason_html}
        <p style="margin-top: 40px; font-size: 13px; color: #94a3b8;">We will notify you if there are further updates regarding this position.</p>
    """
    send_email(to_email, subject, _get_base_template(content))
 
 
def send_interview_reschedule(
    to_email: str,
    to_name: str,
    candidate_name: str,
    job_title: str,
    company_name: str,
    old_time: str,
    new_time: str,
    meeting_link: str,
) -> None:
    subject = f"Interview Rescheduled: {candidate_name} — {job_title}"
    fname = to_name.split()[0].title() if to_name else "Team Member"
    
    content = f"""
        <h2 class="title">Interview Rescheduled</h2>
        <p class="description">Hi {fname}, your interview for <strong>{job_title}</strong> with <strong>{candidate_name}</strong> has been moved to a new time.</p>
        
        <div class="info-box">
            <div style="margin-bottom: 20px; opacity: 0.6;">
                <div class="info-label">Previous Time</div>
                <div class="info-value" style="font-size: 16px; text-decoration: line-through;">{old_time}</div>
            </div>
            <div style="margin-bottom: 20px;">
                <div class="info-label">New Scheduled Time</div>
                <div class="info-value">{new_time}</div>
            </div>
            <div>
                <div class="info-label">Meeting URL</div>
                <div style="font-size: 14px; font-weight: 600; word-break: break-all; color: #6c47ff;">{meeting_link}</div>
            </div>
        </div>
 
        <a href="{meeting_link}" class="button">Join Rescheduled Interview</a>
    """
    send_email(to_email, subject, _get_base_template(content))
