import { expect } from 'chai';
import { render } from 'inferno';
import Component from 'inferno-component';
import { assert, spy } from 'sinon';
import { innerHTML } from '../../tools/utils';

describe('Stateful Component updates', () => {

	let container;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.innerHTML = '';
		document.body.removeChild(container);
	});

	it('Should forget old updates', (done) => {
		let updatesAfromOutside;

		class A extends Component<any, any> {
			componentWillUnmount() {}

			constructor(props) {
				super(props);

				this.state = {
					stuff: true,
				};

				updatesAfromOutside = this.updateMe.bind(this);
			}

			updateMe() {
				this.setState({
					stuff: false,
				});
			}

			render() {
				return <div>A Component A</div>;
			}
		}

		class B extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return <div>B Component B</div>;
			}
		}

		// Render A
		const sinonSpy = spy(A.prototype, 'componentWillUnmount');
		render(<A />, container);
		expect(container.innerHTML).to.equal(innerHTML('<div>A Component A</div>'));
		// Render B
		render(<B />, container);
		expect(container.innerHTML).to.equal(innerHTML('<div>B Component B</div>'));
		assert.calledOnce(sinonSpy); // componentUnMount should have been called
		sinonSpy.restore();

		// delayed update triggers for A
		updatesAfromOutside();
		expect(container.innerHTML).to.equal(innerHTML('<div>B Component B</div>'));

		done();
	});

	it('Should give better error message when calling setState from constructor ??', () => {

		// Following test simulates situation that setState is called when mounting process has not finished, fe. in constructor

		class Parent extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					show: false,
				};

				this.domagic = this.domagic.bind(this);

				// Call setState
				expect(() => this.setState({
					show: true,
				})).to.throw;
			}

			domagic() {
				this.setState({
					show: !this.state.show,
				});
			}

			render() {
				return (
					<div>
						<button onclick={this.domagic}/>
						<Child show={this.state.show}/>
					</div>
				);
			}
		}

		class Child extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<div>
						{this.props.show ? <span className="hr red"><span className="hr-text">Late</span></span> : null}
						<p>More content</p>
					</div>
				);
			}
		}

		render(<Parent />, container);
	});

	it('Should update boolean properties when children change same time', () => {
		let updateCaller = null;

		class A extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					values: [
						{ checked: false },
						{ checked: false },
						{ checked: false },
					],
				};

				this.updateCaller = this.updateCaller.bind(this);
				updateCaller = this.updateCaller;
			}

			updateCaller() {
				this.setStateSync({
					values: [
						{ checked: false },
						{ checked: false },
					],
				});
			}

			render() {
				return (
					<div>
						{this.state.values.map(function(value) {
							return <input type="checkbox" checked={value.checked}/>;
						})}
					</div>
				);
			}
		}

		render(<A />, container);
		expect(container.innerHTML).to.equal(innerHTML('<div><input type="checkbox"><input type="checkbox"><input type="checkbox"></div>'));
		const firstChild = container.firstChild;
		expect(firstChild.childNodes[0].checked).to.equal(false);
		expect(firstChild.childNodes[1].checked).to.equal(false);
		expect(firstChild.childNodes[2].checked).to.equal(false);

		const checkbox = container.querySelector('input');
		checkbox.checked = true; // SIMULATE user selecting checkbox
		expect(firstChild.childNodes[0].checked).to.equal(true, 'USER SHOULD BE ABLE TO TICK CHECKBOX');

		updateCaller(); // New render
		expect(container.innerHTML).to.equal(innerHTML('<div><input type="checkbox"><input type="checkbox"></div>'));
		expect(firstChild.childNodes[0].checked).to.equal(false, 'AFTER NEW RENDER IT SHOULD RENDER INPUT AS UNCHECKED');
		expect(firstChild.childNodes[1].checked).to.equal(false);

	});

	it('Should Not get stuck in UNMOUNTED state', () => {
		let updateCaller = null;

		// This parent is used for setting up Test scenario, not much related
		class Parent extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<div>
						<A/>
					</div>
				);
			}
		}

		// A component holds all the stuff together
		class A extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					obj: {
						test: true,
					},
				};

				this.updateCaller = this.updateCaller.bind(this);
				updateCaller = this.updateCaller;
			}

			updateCaller() {
				this.setStateSync({
					obj: {
						test: !this.state.obj.test,
					},
				});
			}

			render() {
				return (
					<div>
						<B data={this.state.obj}/>
					</div>
				);
			}
		}
		// B has direct child C, B Is simple wrapper component
		class B extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<C data={this.props.data}/>
				);
			}
		}

		let StuckChild = null;

		// C is real component which does the job
		// C is the one that gets unmounted...
		class C extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					b: false,
				};

				this.imstuck = this.imstuck.bind(this);
				StuckChild = this.imstuck;
			}

			imstuck() {
				this.setStateSync({
					b: !this.state.b,
				});
			}

			render() {
				return (
					<div>
						{this.props.data.test + ''}
						{this.state.b + ''}
					</div>
				);
			}
		}

		render(<Parent />, container);

		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truefalse</div></div></div>'));

		updateCaller();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsefalse</div></div></div>'));
		updateCaller();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truefalse</div></div></div>'));
		updateCaller();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsefalse</div></div></div>'));
		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsetrue</div></div></div>'));
		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsefalse</div></div></div>'));
		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsetrue</div></div></div>'));
	});

	it('Should Not get stuck in UNMOUNTED state - variation2', () => {
		let updateCaller = null;

		// This parent is used for setting up Test scenario, not much related
		class Parent extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<div>
						<A/>
					</div>
				);
			}
		}

		// A component holds all the stuff together
		class A extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					obj: {
						test: true,
					},
				};

				this.updateCaller = this.updateCaller.bind(this);
				updateCaller = this.updateCaller;
			}

			updateCaller() {
				this.setStateSync({
					obj: {
						test: !this.state.obj.test,
					},
				});
			}

			render() {
				return (
					<div>
						<B data={this.state.obj}/>
					</div>
				);
			}
		}
		// B has direct child C, B Is simple wrapper component
		class B extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<C data={this.props.data}/>
				);
			}
		}

		let StuckChild = null;

		// C is real component which does the job
		// C is the one that gets unmounted...
		class C extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					b: false,
				};

				this.imstuck = this.imstuck.bind(this);
				StuckChild = this.imstuck;
			}

			imstuck() {
				this.setStateSync({
					b: !this.state.b,
				});
			}

			render() {
				return (
					<div>
						{this.props.data.test + ''}
						{this.state.b + ''}
					</div>
				);
			}
		}

		render(<Parent />, container);

		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truefalse</div></div></div>'));

		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truetrue</div></div></div>'), 'failed here?');
		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truefalse</div></div></div>'));
		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truetrue</div></div></div>'));

		updateCaller();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsetrue</div></div></div>'));
		updateCaller();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>truetrue</div></div></div>'));
		updateCaller();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsetrue</div></div></div>'));

		StuckChild();
		expect(container.innerHTML).to.equal(innerHTML('<div><div><div>falsefalse</div></div></div>'));
	});

	it('Should keep order of nodes', () => {
		let setItems = null;

		class InnerComponentToGetUnmounted extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<div className="common-root">
						{(() => {
							if (this.props.i % 2 === 0) {
								return (
									<div>DIV{this.props.value}</div>
								);
							} else {
								return (
									<span>SPAN{this.props.value}</span>
								);
							}
						})()}
					</div>
				);
			}
		}

		const DropdownItem = ({ children }) => (
			<li>{children}</li>
		);

		class Looper extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					items: [],
				};

				this.setItems = this.setItems.bind(this);

				setItems = this.setItems;
			}

			setItems(collection) {
				this.setStateSync({
					items: collection,
				});
			}

			render() {
				return (
					<div>
						<ul>
							{this.state.items.map(function(item, i) {
								return (
									<DropdownItem key={item.value}>
										<InnerComponentToGetUnmounted key={0} i={i} value={item.value}/>
										<span key={1}>{item.text}</span>
									</DropdownItem>
								);
							})}
						</ul>
					</div>
				);
			}
		}

		render(<Looper />, container);
		expect(container.innerHTML).to.equal(innerHTML('<div><ul></ul></div>'));
		setItems([
			{ value: 'val1', text: 'key1' },
			{ value: 'val2', text: 'key2' },
			{ value: 'val3', text: 'key3' },
			{ value: 'val4', text: 'key4' },
		]);

		expect(container.innerHTML).to.equal(innerHTML('<div><ul><li><div class="common-root"><div>DIVval1</div></div><span>key1</span></li><li><div class="common-root"><span>SPANval2</span></div><span>key2</span></li><li><div class="common-root"><div>DIVval3</div></div><span>key3</span></li><li><div class="common-root"><span>SPANval4</span></div><span>key4</span></li></ul></div>'));

		setItems([
			{ value: 'val2', text: 'key2' },
			{ value: 'val3', text: 'key3' },
		]);
		expect(container.innerHTML).to.equal(innerHTML('<div><ul><li><div class="common-root"><div>DIVval2</div></div><span>key2</span></li><li><div class="common-root"><span>SPANval3</span></div><span>key3</span></li></ul></div>'));

		setItems([
			{ value: 'val1', text: 'key1' },
			{ value: 'val2', text: 'key2' },
			{ value: 'val3', text: 'key3' },
			{ value: 'val4', text: 'key4' },
		]);
		expect(container.innerHTML).to.equal(innerHTML('<div><ul><li><div class="common-root"><div>DIVval1</div></div><span>key1</span></li><li><div class="common-root"><span>SPANval2</span></div><span>key2</span></li><li><div class="common-root"><div>DIVval3</div></div><span>key3</span></li><li><div class="common-root"><span>SPANval4</span></div><span>key4</span></li></ul></div>'));
	});

	it('Should not crash when patching array to array with hooks', () => {
		let updater = null;
		const stuff = [<div >{['Test']}</div>, <span>1</span>];
		const orig = [[<span ref={function(){}}>{'1'}</span>]];
		class Stuff extends Component<any, any> {
			constructor(props) {
				super(props);

				this.state = {
					stuff,
				};

				updater = (_stuff) => {
					this.setStateSync({ stuff: _stuff });
				};
			}

			render() {
				return (
					<div>
						<div>
							{this.state.stuff}
						</div>
					</div>
				);
			}
		}

		render(<Stuff />, container);
		updater(orig);
		expect(container.innerHTML).to.equal(innerHTML('<div><div><span>1</span></div></div>'));

	});

	it('Should allow camelCase properties when using JSX plugin', () => {
		const fakeObj = {func() {}};
		const submitSpy = spy(fakeObj, 'func');

		class Tester extends Component<any, any> {
			constructor(props) {
				super(props);
			}

			render() {
				return (
					<form>
						<input id="inputId" onFocus={(e) => {
							expect(e).to.be.ok;
						}} type="text"/>
					</form>
				);
			}
		}

		render(<Tester/>, container);
		expect(
			innerHTML(container.innerHTML),
		).to.eql(
			innerHTML('<form><input id="inputId" type="text"></form>'),
		);
		const input = container.querySelector('#inputId');
		expect(assert.notCalled(submitSpy));
		input.focus();
	});

	it('Should not append when replacing ES6 component with functional component', () => {
		const A = function() {
			return (
				<div>
					<div className="topheader">
						<h1>A</h1>
					</div>
				</div>
			);
		};

		function B() {
			return (
				<div className="simplegrid">
					<div className="topheader">
						<h1>B</h1>
					</div>
					<div className="viewcontent fullscreen">
						<C/>
					</div>
				</div>
			);
		}

		class C extends Component<any, any> {
			componentWillUnmount() { }

			render() {

				// TODO instead of giving whole setting stuff give in own properties to ReportGrid!
				return (
					<div className="report-container">
						C
					</div>
				);
			}
		}

		const expectedA = '<div><div class="topheader"><h1>A</h1></div></div>';
		const expectedB = '<div class="simplegrid"><div class="topheader"><h1>B</h1></div><div class="viewcontent fullscreen"><div class="report-container">C</div></div></div>';
		render(<A/>, container);
		expect(container.innerHTML).to.eql(expectedA);

		render(<B/>, container);
		expect(container.innerHTML).to.eql(expectedB);

		// SO FAR SO GOOD

		// NOW START SWAPPING

		render(<A/>, container);
		expect(container.innerHTML).to.eql(expectedA);

		render(<B/>, container);
		expect(container.innerHTML).to.eql(expectedB);

		render(<A/>, container);
		expect(container.innerHTML).to.eql(expectedA);

		render(<B/>, container);
		expect(container.innerHTML).to.eql(expectedB);

		render(<A/>, container);
		expect(container.innerHTML).to.eql(expectedA);

		render(<B/>, container);
		expect(container.innerHTML).to.eql(expectedB);

		render(<A/>, container);
		expect(container.innerHTML).to.eql(expectedA);

		render(<B/>, container);
		expect(container.innerHTML).to.eql(expectedB);
	});
});
