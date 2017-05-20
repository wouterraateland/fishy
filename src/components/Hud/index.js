import React, { Component } from 'react';
import './styles.css';

import jumpImage from './jump.svg';

import ActionButton from '../ActionButton';

class Hud extends Component {
	render() {
		return (
			<div className="Hud">
				<ActionButton position="left bottom" image={jumpImage}/>
				<ActionButton position="right bottom"/>
			</div>
		);
	}
}

export default Hud;
