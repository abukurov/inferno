import { isArray, isStringOrNumber, isNullOrUndefined, isInvalidNode } from '../core/utils';

function renderChildren(children) {
	if (children && isArray(children)) {
		const childrenResult = [];

		for (let i = 0; i < children.length; i++) {
			const child = children[i];

			if (isStringOrNumber(child)) {
				childrenResult.push(child);
			} else {
				childrenResult.push(renderNode(child));
			}
		}
		return childrenResult.join('')
	} else if (!isInvalidNode(children)) {
		if (isStringOrNumber(children)) {
			return children;
		} else {
			return renderNode(children);
		}
	}
}

function renderNode(node) {
	if (!isInvalidNode(node)) {
		const tag = node.tag;
		const attrs = [];

		if (!isNullOrUndefined(node.className)) {
			attrs.push('class="' + node.className + '"');
		}

		return `<${ tag }${ attrs.length > 0 ? ' ' + attrs.join(' ') : '' }>${ renderChildren(node.children) || '' }</${ tag }>`;
	}
}

export default function renderToString(node) {
	return renderNode(node);
}