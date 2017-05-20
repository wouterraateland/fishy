import React, { Component } from 'react';
import './styles.css';

class ActionButton extends Component {
	render() {
		let image = null
		if (this.props.image) {
			image = <img className="ActionImage" src={this.props.image} />;
		}

		return (
			<div className={"ActionButton " + this.props.position}>
				{image}
			</div>
		);
	}
}

export default ActionButton;
