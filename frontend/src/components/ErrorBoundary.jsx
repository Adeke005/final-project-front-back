import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Keep a console breadcrumb for debugging runtime crashes.
    console.error("UI error boundary captured:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="page small-page">
          <article className="card">
            <h2>Something went wrong</h2>
            <p className="small-text">Please refresh the page and try again.</p>
          </article>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
