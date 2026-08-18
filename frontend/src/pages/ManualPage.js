import { useMemo, useState } from 'react';
import StatCard from '../components/common/StatCard';
import Tabs from '../components/common/Tabs';

const manualTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'daily-visits', label: 'Daily Visits' },
  { id: 'departments', label: 'Workflow' },
  { id: 'pricing', label: 'Catalogs' },
  { id: 'duty', label: 'Duty Roster' },
  { id: 'tips', label: 'Tips' },
];

function ManualPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const summaryCards = useMemo(
    () => [
      { label: 'Main Goal', value: 'No paperwork' },
      { label: 'Visit Rule', value: '1 active visit per patient' },
      { label: 'Queues', value: 'Cashier, Doctor, Lab, Pharmacy' },
    ],
    []
  );

  return (
    <div className="page-stack">
      <div className="stats-grid stats-grid-compact">
        {summaryCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <section className="panel">
        <Tabs tabs={manualTabs} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'overview' ? (
          <div className="line-item-stack">
            <p className="panel-copy">
              HealthNova is built to remove paper files and repeated handwriting. The idea is simple:
              every patient is registered once, every daily visit is tracked from start to finish, and
              each department works from the same shared visit record.
            </p>
            <ul className="notes-list">
              <li>`Patients` keeps the master patient profile and long-term history.</li>
              <li>`Appointments` now separates booked queue, in-progress cases, and completed bookings.</li>
              <li>`Daily Visits` is for opening and managing today&apos;s visit.</li>
              <li>`Workflow` is where cashier, doctor, lab, and pharmacy work from their live queues.</li>
              <li>`Settings > Config` keeps departments, categories, and branding used across the system.</li>
              <li>`Services` stores shared diagnosis, condition, lab, and administrative catalogs.</li>
              <li>`Finance > Pricing` keeps the billable catalog and official prices in one place.</li>
              <li>`Duty Roster` shows who is on duty for day and night shifts.</li>
            </ul>
          </div>
        ) : null}

        {activeTab === 'daily-visits' ? (
          <div className="line-item-stack">
            <p className="panel-copy">
              A daily visit is the patient&apos;s movement for one day. It starts when reception opens the
              visit and ends when the visit is closed.
            </p>
            <ul className="notes-list">
              <li>Only an existing patient can get a visit. That avoids duplicate records.</li>
              <li>A patient cannot have two open visits at the same time. The first one must be closed.</li>
              <li>Doctors can record complaint, diagnosis, diagnosis detail, medical conditions, and notes inside that visit.</li>
              <li>Lab tests and medications belong to that same visit, so the whole story stays together.</li>
              <li>Doctors should use diagnosis lookup first. If a diagnosis is missing, use `Add To List` once so the whole hospital can reuse it.</li>
              <li>When the visit is closed, the patient history tab still keeps that medical record.</li>
            </ul>
            <p className="panel-copy">
              Practical flow: reception opens visit -> cashier clears consultation -> doctor reviews ->
              doctor selects diagnosis and requests tests or medication -> cashier clears tests if needed ->
              lab works -> doctor reviews available results -> pharmacy prepares medication -> cashier clears
              medication -> pharmacist dispenses -> visit closes.
            </p>
          </div>
        ) : null}

        {activeTab === 'departments' ? (
          <div className="line-item-stack">
            <p className="panel-copy">
              `Workflow` is the operational board for cashier, doctor, lab, and pharmacy. Each team opens
              its own queue tab and works only on the actions that belong to that desk.
            </p>
            <ul className="notes-list">
              <li><strong>Cashier queue</strong>: clears consultation, lab, and medication payments as the same visit loops back for billing.</li>
              <li><strong>Doctor queue</strong>: records conditions, diagnosis, diagnosis detail, notes, test requests, and prescriptions.</li>
              <li><strong>Lab queue</strong>: handles lab processing and result readiness.</li>
              <li><strong>Pharmacy queue</strong>: handles stock confirmation, invoicing, treatment handoff, and dispensing.</li>
              <li><strong>New Arrivals</strong>: work that has reached that desk but has not yet been touched there.</li>
              <li><strong>Returns / Follow-up</strong>: work that came back to the same desk after another step, like doctor review after lab results or cashier payment after pharmacy invoicing.</li>
            </ul>
            <p className="panel-copy">
              `Settings > Config` is where you maintain the reusable department registry used for staff assignment and system setup.
            </p>
            <ul className="notes-list">
              <li><strong>Administrative</strong>: front desk or office-type areas, like Reception.</li>
              <li><strong>Clinical</strong>: doctor-led care areas, like General OPD or Pediatrics.</li>
              <li><strong>Diagnostic</strong>: testing areas, like Laboratory or Radiology.</li>
              <li><strong>Finance</strong>: money collection or insurance areas, like Cashier.</li>
              <li><strong>Support</strong>: support services, like Pharmacy.</li>
              <li><strong>Inpatient</strong>: admission and ward care.</li>
              <li><strong>Surgical</strong>: theatre and operation-related areas.</li>
            </ul>
            <p className="panel-copy">
              The same visit can appear in more than one queue when needed. For example, the doctor can still
              monitor lab progress while pharmacy and cashier continue with medication billing and dispensing.
            </p>
          </div>
        ) : null}

        {activeTab === 'pricing' ? (
          <div className="line-item-stack">
            <p className="panel-copy">
              HealthNova now uses shared catalogs so staff can look up the same items everywhere instead of
              typing different names in different screens.
            </p>
            <ul className="notes-list">
              <li>`Pharmacy > Medications` stores the medication list, stock, brand, category, and price.</li>
              <li>`Services > Medi-Conditions` stores reusable condition entries.</li>
              <li>`Services > Diagnoses` stores the diagnosis lookup doctors use during consultation.</li>
              <li>`Services > Lab` stores test names used by doctors, finance, and laboratory.</li>
              <li>`Services > Administrative` stores consultation fees, admission fees, bed charges, and related services.</li>
              <li>`Finance > Pricing` gives one place to review all billable sections together.</li>
              <li>If an item is missing during workflow, staff can use `Add To List` so the new item becomes reusable across the system.</li>
            </ul>
          </div>
        ) : null}

        {activeTab === 'duty' ? (
          <div className="line-item-stack">
            <p className="panel-copy">
              Duty roster shows which staff are working on a particular date and shift.
            </p>
            <ul className="notes-list">
              <li><strong>Day shift</strong> is for daytime coverage.</li>
              <li><strong>Night shift</strong> is for overnight coverage.</li>
              <li>Reception can check the roster before booking appointments.</li>
              <li>Appointment booking uses the duty roster to show clinicians who are on duty for that shift.</li>
            </ul>
            <p className="panel-copy">
              Example: if Dr. Mensah is on night shift only, staff should not promise a daytime appointment
              with that doctor unless admin changes the roster.
            </p>
          </div>
        ) : null}

        {activeTab === 'tips' ? (
          <div className="line-item-stack">
            <p className="panel-copy">Simple working tips for everyday use:</p>
            <ul className="notes-list">
              <li>Register the patient once, then reuse that profile forever.</li>
              <li>Always search for the patient before opening a new visit.</li>
              <li>If the system says a visit is already active, finish or close that visit first.</li>
              <li>Doctors should record conditions, diagnosis, diagnosis detail, and notes inside the visit so the patient history stays complete.</li>
              <li>Use lookup lists first before typing free text, especially for diagnosis, tests, and medication.</li>
              <li>Use pricing and service catalogs for official charges, and duty roster for staff availability.</li>
              <li>If a patient returns tomorrow, open a new visit, not a new patient profile.</li>
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default ManualPage;
