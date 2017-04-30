var React = require('react')
var Layout = require('./layout')

class NewInvestment extends React.Component {
  render() {
    const clientDropdownNodes = this.props.userEmailsAndNames.map((user, index) => {
      return(
        <option value={user.email}>{user.firstName + ' ' + user.lastName}</option>
      )
    })
    return(
      <Layout title="Investments">
        <div className="container-full justify-center">
          <form action="/newInvestment" method="post">
            <span className="FormDescription">Please enter a few details about the investment</span>
            <div className="FormGroup">
              <select name="clientEmail">
                <option value="" disabled selected>Choose a client</option>
                {clientDropdownNodes}
              </select>
            </div>
            <div className="FormGroup">
              <input type="text" required name="usdInvestment" placeholder="Investment amount in US Dollars" />
            </div>
            <div className="FormGroup">
              <input type="text" required name="cryptoType" placeholder="Type of cryptocurrency" />
            </div>
            <div className="FormGroup">
              <input type="text" required name="cryptoAmount" placeholder="Number of coins" />
            </div>
            <div className="FormGroup">
              <input type="text" required name="cryptoPrice" placeholder="Price per coin in US Dollars" />
            </div>
            <div className="FormGroup flex-column align-center">
              <button className="Button Button-Primary" type="submit">Add Investment</button>
            </div>
          </form>
        </div>
      </Layout>
    )
  }
}

module.exports = NewInvestment;
