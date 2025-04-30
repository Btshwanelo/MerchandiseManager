import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import React, { useState } from 'react';

// Create a simplified version of the progress stepper for testing
const ProgressStepper = ({ activeStep }: { activeStep: string }) => {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Step 1: Stock Take */}
      <div className="flex flex-col" data-testid="step-1">
        <div className={`h-2 rounded-full mb-2 ${activeStep === 'stock-take' || activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`} data-testid="step-1-bar"></div>
        <h3 className={`font-medium ${activeStep === 'stock-take' || activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'text-blue-600' : ''}`}>Stock Take</h3>
        <p className="text-sm text-muted-foreground">Stock taking at shelf or Store</p>
      </div>
      
      {/* Step 2: Merchandising */}
      <div className="flex flex-col" data-testid="step-2">
        <div className={`h-2 rounded-full mb-2 ${activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`} data-testid="step-2-bar"></div>
        <h3 className={`font-medium ${activeStep === 'merchandising' || activeStep === 'competitor' || activeStep === 'order' ? 'text-blue-600' : ''}`}>Merchandising</h3>
        <p className="text-sm text-muted-foreground">Promotions for any of our products</p>
      </div>
      
      {/* Step 3: Competitor Promotions */}
      <div className="flex flex-col" data-testid="step-3">
        <div className={`h-2 rounded-full mb-2 ${activeStep === 'competitor' || activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`} data-testid="step-3-bar"></div>
        <h3 className={`font-medium ${activeStep === 'competitor' || activeStep === 'order' ? 'text-blue-600' : ''}`}>Competitor Promotions</h3>
        <p className="text-sm text-muted-foreground">Any promotions from competitors</p>
      </div>
      
      {/* Step 4: Orders */}
      <div className="flex flex-col" data-testid="step-4">
        <div className={`h-2 rounded-full mb-2 ${activeStep === 'order' ? 'bg-blue-600' : 'bg-gray-200'}`} data-testid="step-4-bar"></div>
        <h3 className={`font-medium ${activeStep === 'order' ? 'text-blue-600' : ''}`}>Orders</h3>
        <p className="text-sm text-muted-foreground">Orders of stock that is depleted etc</p>
      </div>
    </div>
  );
};

// Create a test component that wraps the ProgressStepper with state management
const TestComponent = () => {
  const [activeStep, setActiveStep] = useState('stock-take');
  
  return (
    <div>
      <ProgressStepper activeStep={activeStep} />
      <div>
        <button onClick={() => setActiveStep('stock-take')} data-testid="stock-take-btn">Go to Stock Take</button>
        <button onClick={() => setActiveStep('merchandising')} data-testid="merchandising-btn">Go to Merchandising</button>
        <button onClick={() => setActiveStep('competitor')} data-testid="competitor-btn">Go to Competitor</button>
        <button onClick={() => setActiveStep('order')} data-testid="order-btn">Go to Order</button>
      </div>
    </div>
  );
};

describe('ProgressStepper', () => {
  test('renders all steps correctly', () => {
    render(<ProgressStepper activeStep="stock-take" />);
    
    expect(screen.getByText('Stock Take')).toBeInTheDocument();
    expect(screen.getByText('Stock taking at shelf or Store')).toBeInTheDocument();
    expect(screen.getByText('Merchandising')).toBeInTheDocument();
    expect(screen.getByText('Promotions for any of our products')).toBeInTheDocument();
    expect(screen.getByText('Competitor Promotions')).toBeInTheDocument();
    expect(screen.getByText('Any promotions from competitors')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Orders of stock that is depleted etc')).toBeInTheDocument();
  });

  test('highlights correct steps based on activeStep', async () => {
    const { getByTestId } = render(<TestComponent />);
    
    // Initially only first step should be highlighted
    expect(getByTestId('step-1-bar')).toHaveClass('bg-blue-600');
    expect(getByTestId('step-2-bar')).toHaveClass('bg-gray-200');
    expect(getByTestId('step-3-bar')).toHaveClass('bg-gray-200');
    expect(getByTestId('step-4-bar')).toHaveClass('bg-gray-200');
    
    // Click merchandising button
    await act(async () => {
      fireEvent.click(getByTestId('merchandising-btn'));
    });
    
    // First and second steps should be highlighted
    await waitFor(() => {
      expect(getByTestId('step-1-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-2-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-3-bar')).toHaveClass('bg-gray-200');
      expect(getByTestId('step-4-bar')).toHaveClass('bg-gray-200');
    });
    
    // Click competitor button
    await act(async () => {
      fireEvent.click(getByTestId('competitor-btn'));
    });
    
    // First, second, and third steps should be highlighted
    await waitFor(() => {
      expect(getByTestId('step-1-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-2-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-3-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-4-bar')).toHaveClass('bg-gray-200');
    });
    
    // Click order button
    await act(async () => {
      fireEvent.click(getByTestId('order-btn'));
    });
    
    // All steps should be highlighted
    await waitFor(() => {
      expect(getByTestId('step-1-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-2-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-3-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-4-bar')).toHaveClass('bg-blue-600');
    });
    
    // Click stock-take button to go back to first step
    await act(async () => {
      fireEvent.click(getByTestId('stock-take-btn'));
    });
    
    // Only first step should be highlighted again
    await waitFor(() => {
      expect(getByTestId('step-1-bar')).toHaveClass('bg-blue-600');
      expect(getByTestId('step-2-bar')).toHaveClass('bg-gray-200');
      expect(getByTestId('step-3-bar')).toHaveClass('bg-gray-200');
      expect(getByTestId('step-4-bar')).toHaveClass('bg-gray-200');
    });
  });

  test('step titles are highlighted correctly', async () => {
    const { getByText, getByTestId } = render(<TestComponent />);
    
    // Check initial state - first step title should be blue
    expect(getByText('Stock Take')).toHaveClass('text-blue-600');
    
    // Go to competitor step
    await act(async () => {
      fireEvent.click(getByTestId('competitor-btn'));
    });
    
    // First three step titles should be blue
    await waitFor(() => {
      const stockTakeEl = getByText('Stock Take');
      const merchandisingEl = getByText('Merchandising');
      const competitorEl = getByText('Competitor Promotions');
      const ordersEl = getByText('Orders');
      
      expect(stockTakeEl).toHaveClass('text-blue-600');
      expect(merchandisingEl).toHaveClass('text-blue-600');
      expect(competitorEl).toHaveClass('text-blue-600');
      expect(ordersEl).not.toHaveClass('text-blue-600');
    });
  });
});