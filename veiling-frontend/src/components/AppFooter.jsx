export default function AppFooter() {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="app-footer__inner">
        <div className="app-footer__copy">© {new Date().getFullYear()} FloraFlow</div>
      </div>
    </footer>
  );
}
