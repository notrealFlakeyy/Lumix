import Head from 'next/head'
import React from 'react'

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>Lumix — Smart Accounting & Invoicing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="site-header">
        <div className="container nav">
          <img src="/logo.svg" alt="Lumix" className="logo" />
          <nav>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a className="cta" href="/signup">Get started</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-copy fade-in-up">
              <h1>Accounting, invoicing and payroll — made simple.</h1>
              <p>Automate bookkeeping, generate invoices, and stay compliant — all in one modern web app tailored for small businesses.</p>
              <div className="hero-actions">
                <a className="btn primary" href="/signup">Start free trial</a>
                <a className="btn ghost" href="#features">Learn more</a>
              </div>
            </div>

            <div className="hero-visual slide-in-right">
              <div className="mockup">
                <div className="mockup-header" />
                <div className="mockup-body">
                  <div className="row">
                    <div className="col small" />
                    <div className="col large" />
                  </div>
                  <div className="row">
                    <div className="col large" />
                    <div className="col small" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features container">
          <h2 className="section-title">Everything your business needs</h2>
          <div className="grid">
            <article className="card fade-in">
              <h3>Automated bookkeeping</h3>
              <p>Connect bank feeds and let intelligent categorization reduce manual work.</p>
            </article>
            <article className="card fade-in delay-1">
              <h3>Fast invoicing</h3>
              <p>Create branded invoices, send reminders, and accept payments online.</p>
            </article>
            <article className="card fade-in delay-2">
              <h3>Payroll & compliance</h3>
              <p>Payroll calculations, tax reports and simple employee management.</p>
            </article>
          </div>
        </section>

        <section id="pricing" className="pricing">
          <div className="container">
            <h2 className="section-title">Simple pricing</h2>
            <div className="grid">
              <div className="price-card">
                <h3>Starter</h3>
                <p className="price">€19<span>/mo</span></p>
                <ul>
                  <li>Basic invoicing</li>
                  <li>Bank sync</li>
                </ul>
                <a className="btn" href="/signup">Choose Package</a>
              </div>
              <div className="price-card popular">
                <h3>Business</h3>
                <p className="price">€49<span>/mo</span></p>
                <ul>
                  <li>All Starter features</li>
                  <li>Payroll & reporting</li>
                </ul>
                <a className="btn primary" href="/signup">Choose Package</a>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="testimonials">
          <div className="container">
            <h2 className="section-title">Teams moving faster with Lumix</h2>
            <p className="section-subtitle">Switch in days, not weeks. Keep your books clean, your invoices paid, and your team aligned.</p>
            <div className="grid">
              <article className="quote-card">
                <p>“Lumix replaced three tools for us. Our month-end close dropped from 10 days to 3.”</p>
                <span>— Mia L., Operations Lead</span>
              </article>
              <article className="quote-card">
                <p>“The payroll and invoicing flow is smooth. We finally have one source of truth.”</p>
                <span>— Theo R., Founder</span>
              </article>
              <article className="quote-card">
                <p>“Setup was painless. We connected our bank in minutes and invoiced our first client the same day.”</p>
                <span>— Priya K., Studio Owner</span>
              </article>
            </div>
          </div>
        </section>

        <section id="contact" className="contact container">
          <h2 className="section-title">Ready to get started?</h2>
          <p>Choose a plan and set up your workspace in minutes. No sales calls required unless you want one.</p>
          <div className="contact-actions">
            <a className="btn primary" href="/signup">Create your account</a>
            <a className="btn ghost" href="/signup">Talk to sales</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <span>© {new Date().getFullYear()} Lumix</span>
          <nav>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
