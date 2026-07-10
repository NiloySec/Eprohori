import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { Button } from '../../components/Button';

describe('Button', () => {
  it('renders the given title', () => {
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(<Button title="বাটন" onPress={() => {}} />);
    });
    const text = tree!.root.findByType(Text);
    expect(text.props.children).toBe('বাটন');
  });

  it('calls onPress when tapped and not disabled', () => {
    const onPress = jest.fn();
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(<Button title="চাপুন" onPress={onPress} />);
    });
    const touchable = tree!.root.findByType(TouchableOpacity);
    act(() => {
      touchable.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables the touchable when disabled is true', () => {
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(<Button title="বন্ধ" onPress={() => {}} disabled />);
    });
    const touchable = tree!.root.findByType(TouchableOpacity);
    expect(touchable.props.disabled).toBe(true);
  });

  it('shows an ActivityIndicator instead of text when loading', () => {
    let tree: import('react-test-renderer').ReactTestRenderer;
    act(() => {
      tree = create(<Button title="লোড হচ্ছে" onPress={() => {}} loading />);
    });
    expect(tree!.root.findAllByType(Text).length).toBe(0);
  });
});
