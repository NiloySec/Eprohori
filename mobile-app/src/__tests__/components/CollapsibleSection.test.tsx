import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { CollapsibleSection } from '../../components/CollapsibleSection';

describe('CollapsibleSection', () => {
  it('keeps children hidden until expanded, then shows them on tap', () => {
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(
        <CollapsibleSection icon="lightbulb-outline" title="টিপস">
          <Text>ভেতরের কনটেন্ট</Text>
        </CollapsibleSection>
      );
    });

    expect(tree!.root.findAllByType(Text).some((n) => n.props.children === 'ভেতরের কনটেন্ট')).toBe(false);

    const header = tree!.root.findByType(TouchableOpacity);
    act(() => {
      header.props.onPress();
    });

    expect(tree!.root.findAllByType(Text).some((n) => n.props.children === 'ভেতরের কনটেন্ট')).toBe(true);
  });

  it('starts expanded when defaultExpanded is true', () => {
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(
        <CollapsibleSection icon="lightbulb-outline" title="টিপস" defaultExpanded>
          <Text>দৃশ্যমান কনটেন্ট</Text>
        </CollapsibleSection>
      );
    });
    expect(tree!.root.findAllByType(Text).some((n) => n.props.children === 'দৃশ্যমান কনটেন্ট')).toBe(true);
  });

  // Regression guard for a real bug fixed in this codebase: a long Bengali
  // title after the icon rendered truncated with no ellipsis unless both
  // numberOfLines and ellipsizeMode were set together on the title Text.
  it('constrains a long title to one line with a tail ellipsis', () => {
    const longTitle = 'এটি একটি অনেক লম্বা বাংলা শিরোনাম যা এক লাইনে ধরার কথা না';
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(
        <CollapsibleSection icon="lightbulb-outline" title={longTitle}>
          <Text>x</Text>
        </CollapsibleSection>
      );
    });
    const titleNode = tree!.root.findAllByType(Text).find((n) => n.props.children === longTitle)!;
    expect(titleNode.props.numberOfLines).toBe(1);
    expect(titleNode.props.ellipsizeMode).toBe('tail');
  });
});
