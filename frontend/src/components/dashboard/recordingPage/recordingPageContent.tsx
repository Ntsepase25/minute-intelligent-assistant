import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../ui/accordion";
import { recording } from "../../../lib/types";
import { FormattedText } from "../../../utils/formatText";

type Props = {
  recording: recording;
  loading: boolean;
};

const RecodingPageContent = ({ recording, loading }: Props) => {
  return (
    <div className="md:w-[90%] w-full mx-auto mt-4 bg-accent shadow-sm rounded-md p-2">
      <Accordion type="single" className="" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-bold">
            Summary of Minutes
          </AccordionTrigger>
          <AccordionContent>
            {loading ? (
              <div>Loading...</div>
            ) : recording && recording.summary ? (
              <FormattedText text={recording.summary} />
            ) : (
              <div className="w-full flex justify-center items-center">
                <i>no summary available</i>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default RecodingPageContent;
