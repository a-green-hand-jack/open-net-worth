// Settings → Help. The Help Center's home in the IA.
//
// Help deliberately has no sidebar row and no topbar control (owner, 2026-08-23): it is a
// reference surface, not a place you work, and both of those are prime space a destination
// has to earn. It lives here instead — beside the other things you go looking for rather
// than use daily — and opens as the workspace-tier modal over whatever you were doing
// (2026-08-24), because a doc browser needs the room without costing you your place.
import { useNavigate } from '@tanstack/react-router'
import { Panel, row } from '../ds'
import { useChatComposerOptional } from '../../../../state/chatComposer'
import { openReportProblem } from '../../../../state/reportProblem'
import { useAppIntl } from '../../../../i18n/useAppIntl'

const DOCS_URL = 'https://docs.opennetworth.ai'

// No SectionProps: this section renders no data and raises no toast, and an unused
// parameter is a lint error the section registry does not require anyone to pay.
export function HelpSection() {
  const { formatMessage } = useAppIntl()
  const navigate = useNavigate()
  const composer = useChatComposerOptional()

  return (
    <>
      <Panel
        title={formatMessage({ id: 'settings.help.title', defaultMessage: 'Help center' })}
        sub={formatMessage({
          id: 'settings.help.subtitle',
          defaultMessage:
            'Guides, concepts, and answers — bundled with the app, so they work offline.',
        })}
      >
        {row(
          formatMessage({ id: 'settings.help.browse', defaultMessage: 'Browse the docs' }),
          formatMessage({
            id: 'settings.help.browseBody',
            defaultMessage:
              'Installing it, the ideas behind it, every feature, and what Lucius can do on your behalf.',
          }),
          // A button, not an <a href="/help">: that was a real page load, which threw away the
          // whole app just to read a doc — and Help is now an overlay this navigation opens
          // over Settings, returning here when it closes.
          <button
            className="rd-btn secondary"
            type="button"
            onClick={() => void navigate({ to: '/help' })}
          >
            {formatMessage({ id: 'settings.help.open', defaultMessage: 'Open' })}
          </button>,
        )}
        {row(
          formatMessage({ id: 'settings.help.web', defaultMessage: 'Docs on the web' }),
          formatMessage({
            id: 'settings.help.webBody',
            defaultMessage: 'The same pages, published — easier to send someone a link to.',
          }),
          <a className="rd-btn secondary" href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            {formatMessage({ id: 'settings.help.visit', defaultMessage: 'Visit' })}
          </a>,
        )}
      </Panel>

      <Panel
        title={formatMessage({ id: 'settings.help.ask', defaultMessage: 'Ask Lucius' })}
        sub={formatMessage({
          id: 'settings.help.askSubtitle',
          defaultMessage: 'He reads the same pages you do.',
        })}
      >
        {row(
          formatMessage({
            id: 'settings.help.askInstead',
            defaultMessage: 'Ask instead of searching',
          }),
          formatMessage({
            id: 'settings.help.askBody',
            defaultMessage:
              'Lucius searches these docs before answering questions about how the app works, and cites the page he used.',
          }),
          // Opens a FRESH thread, for the same reason "Ask Lucius about <asset>" does: a
          // question about how the app works has nothing to do with whatever conversation
          // happens to be open. The composer is left empty — we don't know what they want to
          // ask, and a canned question in your own composer reads like a placeholder.
          // Lucius is exempt from the Settings modal's outside-click dismissal
          // (ui/Modal.tsx::isOutsideExempt), so it opens cleanly over this pane.
          <button
            className="rd-btn secondary"
            type="button"
            disabled={!composer}
            onClick={() => composer?.requestOpen(true)}
          >
            {formatMessage({ id: 'settings.help.ask', defaultMessage: 'Ask Lucius' })}
          </button>,
        )}
      </Panel>

      <Panel
        title={formatMessage({ id: 'settings.help.feedback', defaultMessage: 'Send feedback' })}
        sub={formatMessage({
          id: 'settings.help.feedbackSubtitle',
          defaultMessage: 'Tell us when something breaks.',
        })}
      >
        {row(
          formatMessage({
            id: 'settings.help.report',
            defaultMessage: 'Send feedback or report a problem',
          }),
          formatMessage({
            id: 'settings.help.reportBody',
            defaultMessage:
              'You see and can edit the whole report before it is sent. Never your book or your files.',
          }),
          // The dialog (or, in the desktop app, its native twin) is where the user reads and
          // edits the report; this row only opens it, so nothing here sends anything.
          <button className="rd-btn secondary" type="button" onClick={() => openReportProblem()}>
            {formatMessage({ id: 'settings.help.send', defaultMessage: 'Send feedback…' })}
          </button>,
        )}
      </Panel>
    </>
  )
}
