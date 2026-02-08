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
            <a className="cta" href="#contact">Get started</a>
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
                <a className="btn primary" href="#contact">Start free trial</a>
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
                <a className="btn" href="#contact">Choose Starter</a>
              </div>
              <div className="price-card popular">
                <h3>Business</h3>
                <p className="price">€49<span>/mo</span></p>
                <ul>
                  <li>All Starter features</li>
                  <li>Payroll & reporting</li>
                </ul>
                <a className="btn primary" href="#contact">Choose Business</a>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="contact container">
          <h2 className="section-title">Get started</h2>
          <p>Sign up for a free trial or contact our sales team for a custom plan.</p>
          <form className="contact-form" onSubmit={(e)=>{e.preventDefault(); window.alert('Thanks — demo signup!')}}>
            <input placeholder="Your email" type="email" required />
            <button className="btn primary" type="submit">Start free trial</button>
          </form>
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
