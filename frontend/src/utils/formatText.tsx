import React from "react";

/**
 * Formats text by converting **text** to bold formatting and handling bullet points
 * @param text - The text to format
 * @returns JSX elements with bold formatting and proper line breaks applied
 */
export const formatTextWithBold = (text: string): React.ReactNode => {
  if (!text) return text;

  // Normalize line breaks and split into sections
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by double asterisks but keep them in the result
  const parts = normalizedText.split(/(\*\*[^*]+\*\*)/g);
  
  const elements: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      const boldText = part.slice(2, -2);
      elements.push(<strong key={`bold-${index}`}>{boldText}</strong>);
    } else if (part.trim()) {
      // Regular text - process line by line
      const lines = part.split('\n');
      
      lines.forEach((line, lineIndex) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('* ')) {
          // Bullet point
          const bulletContent = trimmedLine.substring(2);
          elements.push(
            <div key={`bullet-${index}-${lineIndex}`} style={{ 
              marginLeft: '20px', 
              marginBottom: '8px',
              lineHeight: '1.5'
            }}>
              • {bulletContent}
            </div>
          );
        } else if (trimmedLine) {
          // Regular text line
          elements.push(
            <span key={`text-${index}-${lineIndex}`}>
              {trimmedLine}
            </span>
          );
          
          // Add line break if not the last line and next line exists
          if (lineIndex < lines.length - 1) {
            elements.push(<br key={`br-${index}-${lineIndex}`} />);
          }
        }
      });
    }
  });
  
  // Post-process to add extra spacing after bullet point sections
  const processedElements: React.ReactNode[] = [];
  
  elements.forEach((element, index) => {
    processedElements.push(element);
    
    // Check if current element is a bullet point and next element is not
    const currentIsBullet = React.isValidElement(element) && 
                           element.props && 
                           element.props.style && 
                           element.props.style.marginLeft === '20px';
    
    const nextElement = elements[index + 1];
    const nextIsBullet = React.isValidElement(nextElement) && 
                        nextElement.props && 
                        nextElement.props.style && 
                        nextElement.props.style.marginLeft === '20px';
    
    // Add double line break after bullet section ends
    if (currentIsBullet && !nextIsBullet && nextElement) {
      processedElements.push(<br key={`spacing-${index}-1`} />);
      processedElements.push(<br key={`spacing-${index}-2`} />);
    }
  });
  
  return processedElements;
};

/**
 * Component that renders text with bold formatting for **text** patterns and proper bullet point formatting
 */
interface FormattedTextProps {
  text: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className }) => {
  return <div className={className}>{formatTextWithBold(text)}</div>;
};
