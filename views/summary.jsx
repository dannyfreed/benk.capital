var React = require('react')
var Layout = require('./layout')
var cx = require('classnames')

class Summary extends React.Component {
  render() {
    const coinSummary = this.props.coinSummary.map((coinSumm, index) => {
      return(
      <tr key={index}>
          <td data-th="Cryptocurrency">{coinSumm.CURRENCY}</td>
          <td style={{textAlign: 'right'}} data-th="Number of Coins">{coinSumm.AMOUNT.toFixed(2)}</td>
        </tr>
      )
    })


    return(
      <Layout isAdmin={true} title="Summary">
        <div style={{margin:'auto', maxWidth: '500px'}}>
          <h2>Summary</h2>
          <p>This is a summary across the entire portfolio</p>
          <table className="rwd-table">
            <thead>
              <tr>
                <th>Crypto</th>
                <th style={{textAlign: 'right'}}># of Coins</th>
              </tr>
            </thead>
            <tbody>
              {coinSummary}
            </tbody>
          </table>
        </div>
      </Layout>
    )
  }
}

module.exports = Summary;
