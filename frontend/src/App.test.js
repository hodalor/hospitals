import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen as app entry point', async () => {
  render(<App />);
  const headingElement = await screen.findByText(/sign in to continue/i);
  expect(headingElement).toBeInTheDocument();
});
