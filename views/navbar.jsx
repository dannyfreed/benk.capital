var React = require('react')

class Navbar extends React.Component {
  render() {
    return(
      <div className="Navbar">
        <div className="Navbar-inner">
          <span className="Navbar-logo">
            <a href="/">Benk.capital</a>
          </span>
          <span className="Navbar-links">
            { this.props.isAdmin ?
              <a href="/summary">Summary</a>
              :
              null
            }
            <a href="/investments">Investments</a>
            <a href="/logout">Logout</a>
          </span>
        </div>
      </div>
    )
  }
}

module.exports = Navbar;
