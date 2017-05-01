var React = require('react')
var Layout = require('./layout')
var moment = require('moment')

class Investments extends React.Component {
  render() {
    const investmentNodes = this.props.investments.map((investment, index) => {
      return(
        <tr>
          <td data-th="Client">
            {
              this.props.isAdmin ?
              <a href={`/investments/${investment.userId}`}>{investment.fullName}</a>
              :
              <span>{investment.fullName}</span>
            }
          </td>
          <td data-th="USD Investment">${investment.usdInvestment}</td>
          <td data-th="Cryptocurrency">{investment.cryptoType}</td>
          <td data-th="Number of coins purchased">{investment.cryptoAmount}</td>
          <td data-th="Purchase price">${investment.cryptoPrice}</td>
        </tr>
      )
    })

    return(
      <Layout title="Investments">
        <a href="/investment/new" className="NewInvestmentButton Button Button-Primary">Add New Investment</a>
        <table className="rwd-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>USD Investment</th>
              <th>Cryptocurrency</th>
              <th>Number of coins purchased</th>
              <th>Purchase price</th>
            </tr>
          </thead>
          <tbody>
            {investmentNodes}
          </tbody>
        </table>
        <br />
        <br />
        <br />
        <div style={{padding: '10px 40px'}}className="flex-column">
          <div>
            <span>Current Portfolio Value: </span>
            <span>${this.props.totalPortfolioValue}</span>
          </div>
          <div>
            <span>Total USD Investment: </span>
            <span>${this.props.usdInvestment}</span>
          </div>
          <div>
            <span>ROI: </span>
            <span>{this.props.roi}%</span>
          </div>
        </div>
      </Layout>
    )
  }
}

module.exports = Investments;
